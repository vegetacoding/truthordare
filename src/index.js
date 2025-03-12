const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "truth_or_dare_game_secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false, // set to true if using https
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Question sets for different modes
const questionSets = {
  friends: {
    truth: [
      "What's the most embarrassing thing your best friend has done?",
      "What's a secret you've never told your best friend?",
      "When did you last lie to your best friend?",
      "What's the weirdest thing you and your best friend have done together?",
      "If you could change one thing about your best friend, what would it be?",
    ],
    dare: [
      "Call your best friend and sing a love song",
      "Do an impression of your best friend",
      "Send a funny selfie to your best friend",
      "Make a TikTok video together",
      "Exchange clothes with each other",
    ],
  },
  couple: {
    truth: [
      "What was your first impression of your partner?",
      "What's the most romantic thing your partner has done for you?",
      "Have you ever been jealous of your partner?",
      "What's one thing you wish your partner would change?",
      "What's your favorite memory together?",
    ],
    dare: [
      "Give your partner a romantic massage",
      "Write a love poem and read it out loud",
      "Do a romantic dance together",
      "Feed each other dessert",
      "Take a cute couple selfie",
    ],
  },
  party: {
    truth: [
      "What's the craziest thing you've done at a party?",
      "Who in this room would you most likely date?",
      "What's your most embarrassing drunk story?",
      "Have you ever crashed a party?",
      "What's a secret you've never told anyone here?",
      "Who is the most annoying person you know?",
      "What's the worst pickup line you've ever used?",
      "What's something you would never do in front of your parents?",
    ],
    dare: [
      "Do a dance in the middle of the room",
      "Let the group choose your next outfit",
      "Call a random contact and sing a song",
      "Do your best celebrity impression",
      "Post an embarrassing story on social media",
      "Let someone else do your makeup",
      "Do a stand-up comedy routine",
      "Eat a spicy food without drinking water",
    ],
  },
};

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.post("/start-game", (req, res) => {
  const players = req.body.players || [];
  const mode = req.body.mode;

  // Validate players and mode
  if (!mode) {
    return res.status(400).send("Game mode must be selected");
  }

  // Mode-specific player count validation
  if ((mode === "friends" || mode === "couple") && players.length !== 2) {
    return res
      .status(400)
      .send(
        `${
          mode.charAt(0).toUpperCase() + mode.slice(1)
        } mode requires exactly 2 players`
      );
  }

  if (mode === "party" && (players.length < 3 || players.length > 10)) {
    return res.status(400).send("Party mode requires 3-10 players");
  }

  // Remove duplicates and empty names
  const uniquePlayers = [
    ...new Set(players.filter((player) => player.trim() !== "")),
  ];

  // Store game state in session
  req.session.players = uniquePlayers;
  req.session.currentPlayerIndex = 0;
  req.session.mode = mode;
  req.session.usedTruthQuestions = [];
  req.session.usedDareQuestions = [];

  // Redirect to game page
  res.render("game", {
    players: uniquePlayers,
    currentPlayer: uniquePlayers[0],
    mode: mode,
  });
});

app.post("/generate", (req, res) => {
  // Ensure game state exists
  if (!req.session.players || !req.session.mode) {
    return res.redirect("/");
  }

  const type = req.body.type;
  const players = req.session.players;
  const mode = req.session.mode;
  const currentPlayerIndex = req.session.currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];

  // Get questions for the current mode
  const questions = questionSets[mode][type];
  const usedQuestions =
    type === "truth"
      ? req.session.usedTruthQuestions || []
      : req.session.usedDareQuestions || [];

  // Reset used questions if all have been used
  if (usedQuestions.length >= questions.length) {
    usedQuestions.length = 0;
  }

  // Find an unused question
  let question;
  do {
    question = questions[Math.floor(Math.random() * questions.length)];
  } while (usedQuestions.includes(question));

  // Mark question as used
  usedQuestions.push(question);

  // Update session
  if (type === "truth") {
    req.session.usedTruthQuestions = usedQuestions;
  } else {
    req.session.usedDareQuestions = usedQuestions;
  }

  // Move to next player
  req.session.currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

  res.render("result", {
    type: type,
    question: question,
    currentPlayer: currentPlayer,
    nextPlayer: players[req.session.currentPlayerIndex],
    mode: mode,
  });
});

app.get("/game", (req, res) => {
  // Check if game session exists
  if (!req.session.players) {
    return res.redirect("/");
  }

  const players = req.session.players;
  const currentPlayerIndex = req.session.currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];
  const mode = req.session.mode;

  res.render("game", {
    players: players,
    currentPlayer: currentPlayer,
    mode: mode,
  });
});

app.get("/restart", (req, res) => {
  // Destroy the current session to reset the game
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error restarting the game");
    }
    // Redirect to the home page to start a new game
    res.redirect("/");
  });
});

// Catch-all route for unhandled routes
app.use((req, res, next) => {
  console.log(`Unhandled route: ${req.method} ${req.path}`);
  res.status(404).send(`Route not found: ${req.path}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Truth or Dare game running on http://localhost:${PORT}`);
});
