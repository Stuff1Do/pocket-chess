import { Chessboard, FEN } from "./node_modules/cm-chessboard/src/cm-chessboard/Chessboard.js"

const board = new Chessboard(document.getElementById("board"), {
    position: FEN.start,
    assetsUrl: "./node_modules/cm-chessboard/assets/"
})