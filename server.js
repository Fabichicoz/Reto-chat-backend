const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Dirección del frontend
    methods: ["GET", "POST"]
  }
});

const messages = []; // Historial de mensajes

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);
    if (extName && mimeType) return cb(null, true);
    cb(new Error("Only .jpg, .png, .gif files are allowed!"));
  }
});

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ruta para subir imágenes
app.post("/upload", upload.single("image"), (req, res) => {
  res.status(200).json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Ruta para servir imágenes
app.get("/images/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Imagen no encontrada");
  }
});

// Socket.IO para mensajes en tiempo real
io.on("connection", (socket) => {
  console.log("Usuario conectado");
  socket.broadcast.emit("Notificaciónes", "¡Un nuevo usuario se ha unido al chat!");
  socket.emit("historial", messages); // Enviar historial al usuario que se conecta

  socket.on("Mensaje", (data) => {
    messages.push(data);
    io.emit("Mensaje", data); // Enviar mensaje a todos
  });

  socket.on("desconectado", () => {
    console.log("Usuario desconectado");
    io.emit("notification", "A user has left the chat.");
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
