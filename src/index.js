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
      "Điều gì là việc làm đáng xấu hổ nhất mà bạn thân của bạn từng làm?",
      "Bí mật nào bạn chưa từng kể với bạn thân của mình?",
      "Lần cuối cùng bạn nói dối bạn thân của bạn là khi nào?",
      "Điều kỳ lạ nhất mà bạn và bạn thân từng làm cùng nhau là gì?",
      "Nếu được thay đổi một điều ở bạn thân, bạn sẽ thay đổi điều gì?",
    ],
    dare: [
      "Gọi điện cho bạn thân và hát một bài hát tình yêu",
      "Bắt chước phong cách của bạn thân",
      "Gửi một tấm ảnh selfie hài hước cho bạn thân",
      "Quay một video TikTok cùng nhau",
      "Trao đổi quần áo với nhau",
    ],
  },
  couple: {
    truth: [
      "Ấn tượng đầu tiên của bạn về người yêu là gì?",
      "Điều lãng mạn nhất mà người yêu từng làm cho bạn là gì?",
      "Bạn đã từng ghen tuông với người yêu chưa?",
      "Một điều bạn muốn người yêu thay đổi là gì?",
      "Kỷ niệm yêu thích nhất của hai bạn là gì?",
    ],
    dare: [
      "Massage lãng mạn cho người yêu",
      "Viết và đọc to một bài thơ tình",
      "Nhảy một điệu nhảy lãng mạn cùng nhau",
      "Cho nhau ăn tráng miệng",
      "Chụp ảnh selfie đôi dễ thương",
    ],
  },
  party: {
    truth: [
      "Điều điên rồ nhất bạn từng làm ở một bữa tiệc là gì?",
      "Ai trong số những người ở đây mà bạn có thể hẹn hò?",
      "Câu chuyện xấu hổ nhất của bạn khi say là gì?",
      "Bạn đã từng xâm nhập một bữa tiệc không được mời chưa?",
      "Bí mật nào bạn chưa từng kể với ai ở đây?",
      "Ai là người khó chịu nhất mà bạn biết?",
      "Câu tán tỉnh tồi tệ nhất bạn từng sử dụng là gì?",
      "Điều gì bạn sẽ không bao giờ làm trước mặt cha mẹ?",
    ],
    dare: [
      "Nhảy múa giữa phòng",
      "Để mọi người chọn trang phục tiếp theo của bạn",
      "Gọi điện cho một liên hệ ngẫu nhiên và hát một bài hát",
      "Bắt chước một ngôi sao nổi tiếng",
      "Đăng một câu chuyện xấu hổ lên mạng xã hội",
      "Để người khác trang điểm cho bạn",
      "Trình diễn một tiết mục hài kịch",
      "Ăn thức ăn cay mà không được uống nước",
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
