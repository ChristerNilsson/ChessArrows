const FILES = "abcdefgh".split("");
const RANKS = "87654321".split("");
const boardEl = document.getElementById("board");
const arrowsEl = document.getElementById("arrows");
const pathEl = document.getElementById("path");
const fenInput = document.getElementById("fen-input");
const loadFenButton = document.getElementById("load-fen");
const resetTreeButton = document.getElementById("reset-tree");

// const START_FEN = "5Q1R/1p5R/p1b1k1p1/5p2/P2P4/3nP1K1/4r3/8 b - - 0 1";
const START_FEN = "2k3rr/ppp1npb1/2Pp4/P7/1PBP4/2P2QBq/7P/R4RK1 w - - 0 1";
const SQUARE_SIZE = 100;
const ARROW_RADIUS = SQUARE_SIZE / 4;
const ARROW_WIDTH = SQUARE_SIZE / 10;
const PREVIEW_ARROW_WIDTH = SQUARE_SIZE / 12;
const LICHESS_PIECE_BASE_URL = "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett";

let nodeId = 0;

const state = {
  acceptedFen: START_FEN,
  root: null,
  currentNode: null,
  selectedFrom: null,
};

function createNode(parent, move, fenAfter) {
  nodeId += 1;
  return {
    id: nodeId,
    parent,
    move,
    fenAfter,
    children: [],
    selectedChildIndex: 0,
  };
}

function freshTree(fen) {
  const root = createNode(null, null, fen);
  state.root = root;
  state.currentNode = root;
  state.selectedFrom = null;
  return root;
}

function coordsToSquare(fileIndex, rankIndex) {
  if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
    return null;
  }
  return `${FILES[fileIndex]}${8 - rankIndex}`;
}

function squareToCoords(square) {
  return {
    file: FILES.indexOf(square[0]),
    rank: 8 - Number(square[1]),
  };
}

function squareCenter(square) {
  const { file, rank } = squareToCoords(square);
  return { x: file * SQUARE_SIZE + SQUARE_SIZE / 2, y: rank * SQUARE_SIZE + SQUARE_SIZE / 2 };
}

function pieceColor(piece) {
  return piece === piece.toUpperCase() ? "w" : "b";
}

function pieceType(piece) {
  return piece.toLowerCase();
}

function pieceMarkup(piece) {
  if (!piece) {
    return "";
  }
  const colorCode = piece === piece.toUpperCase() ? "w" : "b";
  const typeCode = piece.toUpperCase();
  const src = `${LICHESS_PIECE_BASE_URL}/${colorCode}${typeCode}.svg`;
  return `<img class="piece-img" src="${src}" alt="" draggable="false" referrerpolicy="no-referrer" />`;
}

function clonePosition(position) {
  return {
    board: { ...position.board },
    activeColor: position.activeColor,
    castling: position.castling,
    enPassant: position.enPassant,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error("FEN måste ha minst fyra fält.");
  }

  const [placement, activeColor, castling, enPassant, halfmove = "0", fullmove = "1"] = parts;
  const rows = placement.split("/");
  if (rows.length !== 8) {
    throw new Error("FEN måste ha åtta rader.");
  }

  const board = {};
  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;
    row.split("").forEach((char) => {
      if (/\d/.test(char)) {
        fileIndex += Number(char);
      } else {
        const square = `${FILES[fileIndex]}${8 - rowIndex}`;
        board[square] = char;
        fileIndex += 1;
      }
    });
    if (fileIndex !== 8) {
      throw new Error("Ogiltig rad i FEN.");
    }
  });

  return {
    board,
    activeColor,
    castling,
    enPassant,
    halfmove: Number(halfmove),
    fullmove: Number(fullmove),
  };
}

function positionToFen(position) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    let row = "";
    let empties = 0;
    for (const file of FILES) {
      const square = `${file}${rank}`;
      const piece = position.board[square];
      if (piece) {
        if (empties) {
          row += String(empties);
          empties = 0;
        }
        row += piece;
      } else {
        empties += 1;
      }
    }
    if (empties) {
      row += String(empties);
    }
    rows.push(row);
  }

  return [
    rows.join("/"),
    position.activeColor,
    position.castling || "-",
    position.enPassant || "-",
    String(position.halfmove ?? 0),
    String(position.fullmove ?? 1),
  ].join(" ");
}

function pathToCurrent() {
  const nodes = [];
  let cursor = state.currentNode;
  while (cursor && cursor.parent) {
    nodes.unshift(cursor);
    cursor = cursor.parent;
  }
  return nodes;
}

function siblingsOfCurrent() {
  if (!state.currentNode || !state.currentNode.parent) {
    return [];
  }
  return state.currentNode.parent.children;
}

function currentSiblingIndex() {
  if (!state.currentNode || !state.currentNode.parent) {
    return -1;
  }
  return state.currentNode.parent.children.indexOf(state.currentNode);
}

function selectedChild(node) {
  if (!node.children.length) {
    return null;
  }
  const index = Math.max(0, Math.min(node.selectedChildIndex, node.children.length - 1));
  node.selectedChildIndex = index;
  return node.children[index];
}

function moveLabel(move) {
  if (!move) {
    return "start";
  }
  return `${move.from}-${move.to}`;
}

function moveToAlgebraic(position, move) {
  const piece = position.board[move.from];
  if (!piece) {
    return moveLabel(move);
  }

  if (pieceType(piece) === "k") {
    if (move.from === "e1" && move.to === "g1") return "O-O";
    if (move.from === "e1" && move.to === "c1") return "O-O-O";
    if (move.from === "e8" && move.to === "g8") return "O-O";
    if (move.from === "e8" && move.to === "c8") return "O-O-O";
  }

  const targetPiece = position.board[move.to];
  const isCapture = Boolean(targetPiece) || move.isEnPassant;
  const type = pieceType(piece);
  const pieceLetterMap = { k: "K", q: "Q", r: "R", b: "B", n: "N" };
  const legalMoves = generateLegalMoves(position);
  let notation = "";

  if (type === "p") {
    if (isCapture) {
      notation += move.from[0] + "x";
    }
    notation += move.to;
  } else {
    notation += pieceLetterMap[type] || "";
    const competingMoves = legalMoves.filter((candidate) =>
      candidate.to === move.to &&
      candidate.from !== move.from &&
      position.board[candidate.from] &&
      pieceType(position.board[candidate.from]) === type
    );
    if (competingMoves.length) {
      const sameFile = competingMoves.some((candidate) => candidate.from[0] === move.from[0]);
      const sameRank = competingMoves.some((candidate) => candidate.from[1] === move.from[1]);
      if (!sameFile) {
        notation += move.from[0];
      } else if (!sameRank) {
        notation += move.from[1];
      } else {
        notation += move.from;
      }
    }
    if (isCapture) {
      notation += "x";
    }
    notation += move.to;
  }

  if (move.promotion) {
    notation += `=${move.promotion.toUpperCase()}`;
  }

  const next = parseFen(move.fenAfter ?? positionToFen(applyMove(position, move)));
  const enemyColor = next.activeColor;
  const enemyKingSquare = findKingSquare(next, enemyColor);
  if (enemyKingSquare && isSquareAttacked(next, enemyKingSquare, enemyColor === "w" ? "b" : "w")) {
    const replies = generateLegalMoves(next);
    notation += replies.length ? "+" : "#";
  }

  return notation;
}

function parsePlacement(fen) {
  return parseFen(fen).board;
}

function drawBoard() {
  boardEl.innerHTML = "";
  const pieces = parsePlacement(state.acceptedFen);

  for (const rank of RANKS) {
    for (const file of FILES) {
      const square = `${file}${rank}`;
      const squareEl = document.createElement("button");
      squareEl.type = "button";
      squareEl.className = `square ${((FILES.indexOf(file) + Number(rank)) % 2 === 0) ? "dark" : "light"}`;
      squareEl.dataset.square = square;

      if (state.selectedFrom === square) {
        squareEl.classList.add("drag-start");
      }

      const piece = pieces[square];
      squareEl.innerHTML = pieceMarkup(piece);

      if (file === "a" || rank === "1") {
        if (file === "a") {
          const rankEl = document.createElement("span");
          rankEl.className = "coord coord-rank";
          rankEl.textContent = rank;
          squareEl.appendChild(rankEl);
        }
        if (rank === "1") {
          const fileEl = document.createElement("span");
          fileEl.className = "coord coord-file";
          fileEl.textContent = file;
          squareEl.appendChild(fileEl);
        }
      }

      boardEl.appendChild(squareEl);
    }
  }
}

function clearArrows() {
  Array.from(arrowsEl.querySelectorAll("line")).forEach((line) => line.remove());
}

function buildArrow(from, to, color, markerId, width, opacity, centerLineColor = null) {
  const start = squareCenter(from);
  const stop = squareCenter(to);
  const dx = stop.x - start.x;
  const dy = stop.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!length) {
    return;
  }
  const ux = dx / length;
  const uy = dy / length;
  const x1 = start.x + ux * ARROW_RADIUS;
  const y1 = start.y + uy * ARROW_RADIUS;
  const x2 = stop.x - ux * ARROW_RADIUS;
  const y2 = stop.y - uy * ARROW_RADIUS;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", width);
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("marker-end", `url(#${markerId})`);
  line.setAttribute("opacity", opacity);
  arrowsEl.appendChild(line);

  if (centerLineColor) {
    const centerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    centerLine.setAttribute("x1", x1);
    centerLine.setAttribute("y1", y1);
    centerLine.setAttribute("x2", x2);
    centerLine.setAttribute("y2", y2);
    centerLine.setAttribute("stroke", centerLineColor);
    centerLine.setAttribute("stroke-width", Math.max(2, width / 5));
    centerLine.setAttribute("stroke-linecap", "round");
    centerLine.setAttribute("opacity", 0.95);
    arrowsEl.appendChild(centerLine);
  }
}

function drawArrows() {
  clearArrows();

  const path = pathToCurrent();
  const currentIndex = path.length - 1;
  path.forEach((node, index) => {
    const color = node.move.color === "w" ? "#f7f7f7" : "#232323";
    const markerId = node.move.color === "w" ? "arrow-white" : "arrow-black";
    const opacity = index === currentIndex ? 0.95 : 0.9;
    const centerLineColor = index === currentIndex ? "#3aa655" : null;
    buildArrow(node.move.from, node.move.to, color, markerId, ARROW_WIDTH, opacity, centerLineColor);
  });

  const siblings = siblingsOfCurrent();
  if (siblings.length > 1) {
    siblings.forEach((node) => {
      if (node === state.currentNode) {
        return;
      }
      const color = node.move.color === "w" ? "#f7f7f7" : "#232323";
      const markerId = node.move.color === "w" ? "arrow-white" : "arrow-black";
      buildArrow(node.move.from, node.move.to, color, markerId, ARROW_WIDTH, 0.65);
    });
  }

}

function updatePanels() {
  pathEl.innerHTML = renderTreeTable(state.root);
}

function renderTreeTable(root) {
  if (!root || !root.children || !root.children.length) {
    return "";
  }

  const rows = [];
  buildTreeRows(root, 0, rows, 0);
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const htmlRows = rows.map((row) => {
    const cells = [];
    for (let depth = 0; depth < columnCount; depth += 1) {
      const node = row[depth];
      if (!node) {
        cells.push('<td class="tree-cell"></td>');
        continue;
      }
      const colorClass = node.move.color === "w" ? " tree-white" : " tree-black";
      const currentClass = node === state.currentNode ? " tree-current" : "";
      const label = moveToAlgebraic(parseFen(node.parent.fenAfter), node.move);
      cells.push(`<td class="tree-cell"><span class="tree-node${colorClass}${currentClass}" data-node-id="${node.id}">${escapeHtml(label)}</span></td>`);
    }
    return `<tr>${cells.join("")}</tr>`;
  });

  return `<table class="tree-table"><tbody>${htmlRows.join("")}</tbody></table>`;
}

function buildTreeRows(node, depth, rows, rowIndex) {
  const children = node.children || [];
  if (!children.length) {
    return;
  }

  if (!rows[rowIndex]) {
    rows[rowIndex] = [];
  }

  children.forEach((child, index) => {
    let targetRowIndex = rowIndex;
    if (index > 0) {
      rows.push([]);
      targetRowIndex = rows.length - 1;
    }
    rows[targetRowIndex][depth] = child;
    buildTreeRows(child, depth + 1, rows, targetRowIndex);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function render() {
  drawBoard();
  drawArrows();
  updatePanels();
}

function findNodeById(node, id) {
  if (!node) {
    return null;
  }
  if (node.id === id) {
    return node;
  }
  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function goToNextMove() {
  const child = selectedChild(state.currentNode);
  if (child) {
    state.currentNode = child;
    render();
  }
}

function goToPreviousMove() {
  if (state.currentNode.parent) {
    state.currentNode = state.currentNode.parent;
    render();
  }
}

function goToSibling(delta) {
  const siblings = siblingsOfCurrent();
  if (siblings.length) {
    const count = siblings.length;
    const index = currentSiblingIndex();
    state.currentNode = siblings[(index + delta + count) % count];
    render();
  }
}

function deleteCurrentSubtree() {
  if (!state.currentNode) {
    return;
  }

  if (!state.currentNode.parent) {
    freshTree(state.acceptedFen);
    render();
    return;
  }

  const parent = state.currentNode.parent;
  const index = parent.children.indexOf(state.currentNode);
  if (index < 0) {
    return;
  }

  parent.children.splice(index, 1);
  if (parent.children.length) {
    parent.selectedChildIndex = Math.min(index, parent.children.length - 1);
  } else {
    parent.selectedChildIndex = 0;
  }
  state.currentNode = parent;
  render();
}

function findKingSquare(position, color) {
  const target = color === "w" ? "K" : "k";
  return Object.keys(position.board).find((square) => position.board[square] === target) || null;
}

function isSquareAttacked(position, targetSquare, byColor) {
  const target = squareToCoords(targetSquare);
  const enemyPawn = byColor === "w" ? "P" : "p";
  const enemyKnight = byColor === "w" ? "N" : "n";
  const enemyBishop = byColor === "w" ? "B" : "b";
  const enemyRook = byColor === "w" ? "R" : "r";
  const enemyQueen = byColor === "w" ? "Q" : "q";
  const enemyKing = byColor === "w" ? "K" : "k";

  const pawnOffsets = byColor === "w" ? [[-1, 1], [1, 1]] : [[-1, -1], [1, -1]];
  for (const [dx, dy] of pawnOffsets) {
    const square = coordsToSquare(target.file + dx, target.rank + dy);
    if (square && position.board[square] === enemyPawn) {
      return true;
    }
  }

  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dx, dy] of knightOffsets) {
    const square = coordsToSquare(target.file + dx, target.rank + dy);
    if (square && position.board[square] === enemyKnight) {
      return true;
    }
  }

  const kingOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  for (const [dx, dy] of kingOffsets) {
    const square = coordsToSquare(target.file + dx, target.rank + dy);
    if (square && position.board[square] === enemyKing) {
      return true;
    }
  }

  const rayGroups = [
    { dirs: [[1, 0], [-1, 0], [0, 1], [0, -1]], pieces: [enemyRook, enemyQueen] },
    { dirs: [[1, 1], [1, -1], [-1, 1], [-1, -1]], pieces: [enemyBishop, enemyQueen] },
  ];

  for (const group of rayGroups) {
    for (const [dx, dy] of group.dirs) {
      let file = target.file + dx;
      let rank = target.rank + dy;
      while (true) {
        const square = coordsToSquare(file, rank);
        if (!square) {
          break;
        }
        const piece = position.board[square];
        if (piece) {
          if (group.pieces.includes(piece)) {
            return true;
          }
          break;
        }
        file += dx;
        rank += dy;
      }
    }
  }

  return false;
}

function removeCastlingRights(castling, flags) {
  let result = castling === "-" ? "" : castling;
  flags.split("").forEach((flag) => {
    result = result.replace(flag, "");
  });
  return result || "-";
}

function applyMove(position, move) {
  const next = clonePosition(position);
  const movingPiece = next.board[move.from];
  const targetPiece = next.board[move.to];
  delete next.board[move.from];

  if (move.isEnPassant) {
    const { file, rank } = squareToCoords(move.to);
    const captureSquare = coordsToSquare(file, rank + (pieceColor(movingPiece) === "w" ? 1 : -1));
    delete next.board[captureSquare];
  }

  if (move.isCastle) {
    if (move.to === "g1") {
      next.board.f1 = next.board.h1;
      delete next.board.h1;
    } else if (move.to === "c1") {
      next.board.d1 = next.board.a1;
      delete next.board.a1;
    } else if (move.to === "g8") {
      next.board.f8 = next.board.h8;
      delete next.board.h8;
    } else if (move.to === "c8") {
      next.board.d8 = next.board.a8;
      delete next.board.a8;
    }
  }

  next.board[move.to] = move.promotion ? move.promotion : movingPiece;

  if (movingPiece === "K") {
    next.castling = removeCastlingRights(next.castling, "KQ");
  }
  if (movingPiece === "k") {
    next.castling = removeCastlingRights(next.castling, "kq");
  }
  if (movingPiece === "R" && move.from === "a1") {
    next.castling = removeCastlingRights(next.castling, "Q");
  }
  if (movingPiece === "R" && move.from === "h1") {
    next.castling = removeCastlingRights(next.castling, "K");
  }
  if (movingPiece === "r" && move.from === "a8") {
    next.castling = removeCastlingRights(next.castling, "q");
  }
  if (movingPiece === "r" && move.from === "h8") {
    next.castling = removeCastlingRights(next.castling, "k");
  }
  if (targetPiece === "R" && move.to === "a1") {
    next.castling = removeCastlingRights(next.castling, "Q");
  }
  if (targetPiece === "R" && move.to === "h1") {
    next.castling = removeCastlingRights(next.castling, "K");
  }
  if (targetPiece === "r" && move.to === "a8") {
    next.castling = removeCastlingRights(next.castling, "q");
  }
  if (targetPiece === "r" && move.to === "h8") {
    next.castling = removeCastlingRights(next.castling, "k");
  }

  next.enPassant = "-";
  if (pieceType(movingPiece) === "p") {
    const fromCoords = squareToCoords(move.from);
    const toCoords = squareToCoords(move.to);
    if (Math.abs(fromCoords.rank - toCoords.rank) === 2) {
      const midRank = (fromCoords.rank + toCoords.rank) / 2;
      next.enPassant = coordsToSquare(fromCoords.file, midRank);
    }
  }

  const isPawnMove = pieceType(movingPiece) === "p";
  const isCapture = Boolean(targetPiece) || move.isEnPassant;
  next.halfmove = isPawnMove || isCapture ? 0 : position.halfmove + 1;
  next.fullmove = position.fullmove + (position.activeColor === "b" ? 1 : 0);
  next.activeColor = position.activeColor === "w" ? "b" : "w";

  return next;
}

function isPathClear(position, from, to, dx, dy) {
  const start = squareToCoords(from);
  const end = squareToCoords(to);
  let file = start.file + dx;
  let rank = start.rank + dy;
  while (file !== end.file || rank !== end.rank) {
    const square = coordsToSquare(file, rank);
    if (!square || position.board[square]) {
      return false;
    }
    file += dx;
    rank += dy;
  }
  return true;
}

function basicMoveOk(position, from, to) {
  const piece = position.board[from];
  if (!piece) {
    return null;
  }

  const color = pieceColor(piece);
  if (color !== position.activeColor) {
    return null;
  }

  const targetPiece = position.board[to];
  if (targetPiece && pieceColor(targetPiece) === color) {
    return null;
  }

  const fromCoords = squareToCoords(from);
  const toCoords = squareToCoords(to);
  const dx = toCoords.file - fromCoords.file;
  const dy = toCoords.rank - fromCoords.rank;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const type = pieceType(piece);

  if (type === "p") {
    const forward = color === "w" ? -1 : 1;
    const startRank = color === "w" ? 6 : 1;
    const promotionRank = color === "w" ? 0 : 7;

    if (dx === 0 && dy === forward && !targetPiece) {
      return {
        from, to, color,
        promotion: toCoords.rank === promotionRank ? (color === "w" ? "Q" : "q") : null,
      };
    }

    if (dx === 0 && dy === 2 * forward && fromCoords.rank === startRank && !targetPiece) {
      const midSquare = coordsToSquare(fromCoords.file, fromCoords.rank + forward);
      if (!position.board[midSquare]) {
        return { from, to, color, promotion: null };
      }
    }

    if (ady === 1 && dy === forward && adx === 1) {
      if (targetPiece) {
        return {
          from, to, color,
          promotion: toCoords.rank === promotionRank ? (color === "w" ? "Q" : "q") : null,
        };
      }
      if (position.enPassant === to) {
        return { from, to, color, promotion: null, isEnPassant: true };
      }
    }

    return null;
  }

  if (type === "n") {
    if ((adx === 1 && ady === 2) || (adx === 2 && ady === 1)) {
      return { from, to, color, promotion: null };
    }
    return null;
  }

  if (type === "b") {
    if (adx === ady && adx > 0 && isPathClear(position, from, to, Math.sign(dx), Math.sign(dy))) {
      return { from, to, color, promotion: null };
    }
    return null;
  }

  if (type === "r") {
    if ((dx === 0 || dy === 0) && !(dx === 0 && dy === 0) && isPathClear(position, from, to, Math.sign(dx), Math.sign(dy))) {
      return { from, to, color, promotion: null };
    }
    return null;
  }

  if (type === "q") {
    const straight = (dx === 0 || dy === 0) && !(dx === 0 && dy === 0);
    const diagonal = adx === ady && adx > 0;
    if ((straight || diagonal) && isPathClear(position, from, to, Math.sign(dx), Math.sign(dy))) {
      return { from, to, color, promotion: null };
    }
    return null;
  }

  if (type === "k") {
    if (adx <= 1 && ady <= 1 && (adx + ady > 0)) {
      return { from, to, color, promotion: null };
    }

    const rights = position.castling === "-" ? "" : position.castling;
    if (color === "w" && from === "e1" && to === "g1" && rights.includes("K")) {
      if (!position.board.f1 && !position.board.g1) {
        return { from, to, color, promotion: null, isCastle: true };
      }
    }
    if (color === "w" && from === "e1" && to === "c1" && rights.includes("Q")) {
      if (!position.board.d1 && !position.board.c1 && !position.board.b1) {
        return { from, to, color, promotion: null, isCastle: true };
      }
    }
    if (color === "b" && from === "e8" && to === "g8" && rights.includes("k")) {
      if (!position.board.f8 && !position.board.g8) {
        return { from, to, color, promotion: null, isCastle: true };
      }
    }
    if (color === "b" && from === "e8" && to === "c8" && rights.includes("q")) {
      if (!position.board.d8 && !position.board.c8 && !position.board.b8) {
        return { from, to, color, promotion: null, isCastle: true };
      }
    }
  }

  return null;
}

function legalMoveOnPosition(position, from, to) {
  const candidate = basicMoveOk(position, from, to);
  if (!candidate) {
    return null;
  }

  const movingColor = position.activeColor;
  const enemyColor = movingColor === "w" ? "b" : "w";

  if (candidate.isCastle) {
    const passSquares = {
      g1: ["e1", "f1", "g1"],
      c1: ["e1", "d1", "c1"],
      g8: ["e8", "f8", "g8"],
      c8: ["e8", "d8", "c8"],
    }[to];

    for (const square of passSquares) {
      if (isSquareAttacked(position, square, enemyColor)) {
        return null;
      }
    }
  }

  const next = applyMove(position, candidate);
  const ownKingSquare = findKingSquare(next, movingColor);
  if (!ownKingSquare) {
    return null;
  }
  if (isSquareAttacked(next, ownKingSquare, enemyColor)) {
    return null;
  }

  candidate.fenAfter = positionToFen(next);
  return candidate;
}

function legalMoveFromCurrent(from, to) {
  const position = parseFen(state.currentNode.fenAfter);
  return legalMoveOnPosition(position, from, to);
}

function insertionBaseNodeForDrag(from) {
  const current = state.currentNode;
  if (!current) {
    return state.root;
  }

  const currentMoveColor = current.move ? current.move.color : null;
  const parent = current.parent;
  if (!currentMoveColor || !parent) {
    return current;
  }

  const parentPosition = parseFen(parent.fenAfter);
  const movingPiece = parentPosition.board[from];
  if (!movingPiece) {
    return current;
  }

  const draggedColor = pieceColor(movingPiece);
  return draggedColor === currentMoveColor ? parent : current;
}

function legalMoveFromNode(node, from, to) {
  const position = parseFen(node.fenAfter);
  return legalMoveOnPosition(position, from, to);
}

function generateLegalMoves(position) {
  const moves = [];
  for (const from of Object.keys(position.board)) {
    const piece = position.board[from];
    if (pieceColor(piece) !== position.activeColor) {
      continue;
    }
    for (const file of FILES) {
      for (let rank = 1; rank <= 8; rank += 1) {
        const to = `${file}${rank}`;
        if (to === from) {
          continue;
        }
        const move = legalMoveOnPosition(position, from, to);
        if (move) {
          moves.push(move);
        }
      }
    }
  }
  return moves;
}

function findExistingChild(node, move) {
  return node.children.find((child) =>
    child.move.from === move.from &&
    child.move.to === move.to &&
    child.move.promotion === move.promotion
  ) || null;
}

function addOrSelectChild(baseNode, move) {
  let node = findExistingChild(baseNode, move);
  if (!node) {
    node = createNode(baseNode, move, move.fenAfter);
    baseNode.children.push(node);
  }
  baseNode.selectedChildIndex = baseNode.children.indexOf(node);
  state.currentNode = node;
}

function undoLatest() {
  if (state.currentNode.parent) {
    state.currentNode = state.currentNode.parent;
  }
}

function loadFen() {
  const candidate = fenInput.value.trim();
  try {
    const normalized = positionToFen(parseFen(candidate));
    state.acceptedFen = normalized;
    freshTree(normalized);
    render();
  } catch (error) {
    window.alert(`Ogiltig FEN:\n${error.message}`);
    fenInput.value = state.acceptedFen;
  }
}

function acceptCurrentPosition() {
  state.acceptedFen = state.currentNode.fenAfter;
  fenInput.value = state.acceptedFen;
  freshTree(state.acceptedFen);
  render();
}

function resetTree() {
  deleteCurrentSubtree();
}

function pieceOnShownBoard(square) {
  return parsePlacement(state.acceptedFen)[square];
}

boardEl.addEventListener("mousedown", (event) => {
  const squareEl = event.target.closest(".square");
  if (!squareEl) {
    return;
  }
  const square = squareEl.dataset.square;

  if (event.button !== 0) {
    return;
  }

  if (!state.selectedFrom) {
    state.selectedFrom = square;
    render();
    return;
  }

  if (state.selectedFrom === square) {
    state.selectedFrom = null;
    render();
    return;
  }

  const from = state.selectedFrom;
  const to = square;
  state.selectedFrom = null;
  if (to !== from) {
    const baseNode = insertionBaseNodeForDrag(from);
    const move = legalMoveFromNode(baseNode, from, to);
    if (move) {
      addOrSelectChild(baseNode, move);
    }
  }

  render();
});

pathEl.addEventListener("click", (event) => {
  const nodeEl = event.target.closest(".tree-node[data-node-id]");
  if (!nodeEl) {
    return;
  }
  const nodeId = Number(nodeEl.dataset.nodeId);
  const node = findNodeById(state.root, nodeId);
  if (!node) {
    return;
  }
  state.currentNode = node;
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    goToNextMove();
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    goToPreviousMove();
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    goToSibling(-1);
    event.preventDefault();
  } else if (event.key === "ArrowDown") {
    goToSibling(1);
    event.preventDefault();
  } else if (event.key === "Delete") {
    deleteCurrentSubtree();
    event.preventDefault();
  }
});

loadFenButton.addEventListener("click", loadFen);
resetTreeButton.addEventListener("click", resetTree);

fenInput.value = state.acceptedFen;
freshTree(state.acceptedFen);
render();
