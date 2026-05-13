FILES = "abcdefgh".split ""
RANKS = "87654321".split ""
boardEl = document.getElementById "board"
arrowsEl = document.getElementById "arrows"
pathEl = document.getElementById "path"
fenInput = document.getElementById "fen-input"
loadFenButton = document.getElementById "load-fen"
resetTreeButton = document.getElementById "reset-tree"

START_FEN = "5Q1R/1p5R/p1b1k1p1/5p2/P2P4/3nP1K1/4r3/8 b - - 0 1"
SQUARE_SIZE = 100
ARROW_RADIUS = SQUARE_SIZE / 4
ARROW_WIDTH = SQUARE_SIZE / 10
PREVIEW_ARROW_WIDTH = SQUARE_SIZE / 12
LICHESS_PIECE_BASE_URL = "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett"
nodeId = 0

state =
  acceptedFen: START_FEN
  root: null
  currentNode: null
  selectedFrom: null

createNode = (parent, move, fenAfter) ->
  id: ++nodeId
  parent: parent
  move: move
  fenAfter: fenAfter
  children: []
  selectedChildIndex: 0

freshTree = (fen) ->
  root = createNode null, null, fen
  state.root = root
  state.currentNode = root
  state.selectedFrom = null
  root

engineFor = (fen) -> new Chess fen

parsePlacement = (fen) ->
  placement = fen.split(" ")[0]
  rows = placement.split "/"
  board = {}
  for row, rowIndex in rows
    fileIndex = 0
    for char in row.split ""
      if /\d/.test char
        fileIndex += parseInt char, 10
      else
        square = "#{FILES[fileIndex]}#{8 - rowIndex}"
        color = if char is char.toUpperCase() then "w" else "b"
        board[square] = "#{color}#{char.toLowerCase()}"
        fileIndex += 1
  board

squareCenter = (square) ->
  file = FILES.indexOf square[0]
  rank = parseInt(square[1], 10)
  x = file * SQUARE_SIZE + SQUARE_SIZE / 2
  y = (8 - rank) * SQUARE_SIZE + SQUARE_SIZE / 2
  {x, y}

pieceColor = (piece) ->
  if piece is piece.toUpperCase() then "w" else "b"

pieceType = (piece) ->
  piece.toLowerCase()

pieceMarkup = (piece) ->
  return "" unless piece?
  colorCode = if piece is piece.toUpperCase() then "w" else "b"
  typeCode = piece.toUpperCase()
  src = "#{LICHESS_PIECE_BASE_URL}/#{colorCode}#{typeCode}.svg"
  "<img class=\"piece-img\" src=\"#{src}\" alt=\"\" draggable=\"false\" referrerpolicy=\"no-referrer\" />"

pathToCurrent = ->
  nodes = []
  cursor = state.currentNode
  while cursor? and cursor.parent?
    nodes.unshift cursor
    cursor = cursor.parent
  nodes

siblingsOfCurrent = ->
  return [] unless state.currentNode? and state.currentNode.parent?
  state.currentNode.parent.children

currentSiblingIndex = ->
  return -1 unless state.currentNode? and state.currentNode.parent?
  state.currentNode.parent.children.indexOf state.currentNode

selectedChild = (node) ->
  return null unless node.children.length
  index = Math.max 0, Math.min node.selectedChildIndex, node.children.length - 1
  node.selectedChildIndex = index
  node.children[index]

moveLabel = (move) ->
  return "start" unless move?
  "#{move.san} (#{move.from}-#{move.to})"

moveToAlgebraic = (position, move) ->
  piece = position.board[move.from]
  return moveLabel(move) unless piece?

  if pieceType(piece) is "k"
    return "O-O" if move.from is "e1" and move.to is "g1"
    return "O-O-O" if move.from is "e1" and move.to is "c1"
    return "O-O" if move.from is "e8" and move.to is "g8"
    return "O-O-O" if move.from is "e8" and move.to is "c8"

  targetPiece = position.board[move.to]
  isCapture = Boolean(targetPiece) or move.isEnPassant
  type = pieceType piece
  pieceLetterMap =
    k: "K"
    q: "Q"
    r: "R"
    b: "B"
    n: "N"

  notation = ""
  if type is "p"
    notation += "#{move.from[0]}x" if isCapture
    notation += move.to
  else
    notation += pieceLetterMap[type] ? ""
    notation += "x" if isCapture
    notation += move.to

  notation += "=#{move.promotion.toUpperCase()}" if move.promotion
  notation

drawBoard = ->
  boardEl.innerHTML = ""
  pieces = parsePlacement state.acceptedFen
  for rank in RANKS
    for file in FILES
      square = "#{file}#{rank}"
      squareEl = document.createElement "button"
      squareEl.type = "button"
      squareEl.className = "square #{if (FILES.indexOf(file) + parseInt(rank, 10)) % 2 is 0 then "dark" else "light"}"
      squareEl.dataset.square = square
      if state.selectedFrom is square
        squareEl.classList.add "drag-start"

      piece = pieces[square]
      squareEl.innerHTML = pieceMarkup piece

      if file is "a" or rank is "1"
        if file is "a"
          rankEl = document.createElement "span"
          rankEl.className = "coord coord-rank"
          rankEl.textContent = rank
          squareEl.appendChild rankEl
        if rank is "1"
          fileEl = document.createElement "span"
          fileEl.className = "coord coord-file"
          fileEl.textContent = file
          squareEl.appendChild fileEl

      boardEl.appendChild squareEl

drawArrows = ->
  while arrowsEl.lastChild?.nodeName isnt "defs"
    arrowsEl.removeChild arrowsEl.lastChild

  defs = arrowsEl.querySelector "defs"
  arrowsEl.appendChild defs if defs isnt arrowsEl.firstChild

  buildArrow = (from, to, color, markerId, width, opacity, centerLineColor = null) ->
    start = squareCenter from
    stop = squareCenter to
    dx = stop.x - start.x
    dy = stop.y - start.y
    length = Math.hypot dx, dy
    return unless length
    ux = dx / length
    uy = dy / length
    x1 = start.x + ux * ARROW_RADIUS
    y1 = start.y + uy * ARROW_RADIUS
    x2 = stop.x - ux * ARROW_RADIUS
    y2 = stop.y - uy * ARROW_RADIUS
    line = document.createElementNS "http://www.w3.org/2000/svg", "line"
    line.setAttribute "x1", x1
    line.setAttribute "y1", y1
    line.setAttribute "x2", x2
    line.setAttribute "y2", y2
    line.setAttribute "stroke", color
    line.setAttribute "stroke-width", width
    line.setAttribute "stroke-linecap", "round"
    line.setAttribute "marker-end", "url(##{markerId})"
    line.setAttribute "opacity", opacity
    arrowsEl.appendChild line
    if centerLineColor?
      centerLine = document.createElementNS "http://www.w3.org/2000/svg", "line"
      centerLine.setAttribute "x1", x1
      centerLine.setAttribute "y1", y1
      centerLine.setAttribute "x2", x2
      centerLine.setAttribute "y2", y2
      centerLine.setAttribute "stroke", centerLineColor
      centerLine.setAttribute "stroke-width", Math.max 2, width / 5
      centerLine.setAttribute "stroke-linecap", "round"
      centerLine.setAttribute "opacity", 0.95
      arrowsEl.appendChild centerLine

  path = pathToCurrent()
  currentIndex = path.length - 1
  for node, index in path
    color = if node.move.color is "w" then "#f7f7f7" else "#232323"
    markerId = if node.move.color is "w" then "arrow-white" else "arrow-black"
    opacity = if index is currentIndex then 0.95 else 0.9
    centerLineColor = if index is currentIndex then "#3aa655" else null
    buildArrow node.move.from, node.move.to, color, markerId, ARROW_WIDTH, opacity, centerLineColor

  siblings = siblingsOfCurrent()
  if siblings.length > 1
    for node in siblings when node isnt state.currentNode
      color = if node.move.color is "w" then "#f7f7f7" else "#232323"
      markerId = if node.move.color is "w" then "arrow-white" else "arrow-black"
      buildArrow node.move.from, node.move.to, color, markerId, ARROW_WIDTH, 0.65

updatePanels = ->
  pathEl.innerHTML = renderTreeTable state.root

renderTreeTable = (root) ->
  return "" unless root? and root.children?.length
  rows = []
  buildTreeRows root, 0, rows, 0
  columnCount = rows.reduce ((max, row) -> Math.max max, row.length), 0
  htmlRows = for row in rows
    cells = for depth in [0...columnCount]
      node = row[depth]
      if not node?
        '<td class="tree-cell"></td>'
      else
        colorClass = if node.move.color is "w" then " tree-white" else " tree-black"
        currentClass = if node is state.currentNode then " tree-current" else ""
        label = moveToAlgebraic parseFen(node.parent.fenAfter), node.move
        "<td class=\"tree-cell\"><span class=\"tree-node#{colorClass}#{currentClass}\" data-node-id=\"#{node.id}\">#{escapeHtml(label)}</span></td>"
    "<tr>#{cells.join("")}</tr>"
  "<table class=\"tree-table\"><tbody>#{htmlRows.join("")}</tbody></table>"

buildTreeRows = (node, depth, rows, rowIndex) ->
  children = node.children ? []
  return unless children.length
  rows[rowIndex] = [] unless rows[rowIndex]?
  for child, index in children
    targetRowIndex = rowIndex
    if index > 0
      rows.push []
      targetRowIndex = rows.length - 1
    rows[targetRowIndex][depth] = child
    buildTreeRows child, depth + 1, rows, targetRowIndex

escapeHtml = (text) ->
  text
    .replaceAll "&", "&amp;"
    .replaceAll "<", "&lt;"
    .replaceAll ">", "&gt;"

render = ->
  drawBoard()
  drawArrows()
  updatePanels()

findNodeById = (node, id) ->
  return null unless node?
  return node if node.id is id
  for child in node.children ? []
    found = findNodeById child, id
    return found if found?
  null

goToNextMove = ->
  child = selectedChild state.currentNode
  if child?
    state.currentNode = child
    render()

goToPreviousMove = ->
  if state.currentNode.parent?
    state.currentNode = state.currentNode.parent
    render()

goToSibling = (delta) ->
  siblings = siblingsOfCurrent()
  if siblings.length
    count = siblings.length
    index = currentSiblingIndex()
    state.currentNode = siblings[(index + delta + count) % count]
    render()

deleteCurrentSubtree = ->
  return unless state.currentNode?
  unless state.currentNode.parent?
    freshTree state.acceptedFen
    render()
    return
  parent = state.currentNode.parent
  index = parent.children.indexOf state.currentNode
  return if index < 0
  parent.children.splice index, 1
  if parent.children.length
    parent.selectedChildIndex = Math.min index, parent.children.length - 1
  else
    parent.selectedChildIndex = 0
  state.currentNode = parent
  render()

findExistingChild = (node, move) ->
  for child in node.children
    return child if child.move.from is move.from and child.move.to is move.to and child.move.promotion is move.promotion
  null

legalMoveFromCurrent = (from, to) ->
  engine = engineFor state.currentNode.fenAfter
  legalMoves = engine.moves verbose: true
  for move in legalMoves
    continue unless move.from is from and move.to is to
    return move
  null

insertionBaseNodeForDrag = (from) ->
  current = state.currentNode
  return state.root unless current?
  currentMoveColor = current.move?.color ? null
  parent = current.parent
  return current unless currentMoveColor? and parent?
  parentPosition = parseFen parent.fenAfter
  movingPiece = parentPosition.board[from]
  return current unless movingPiece?
  draggedColor = pieceColor movingPiece
  if draggedColor is currentMoveColor then parent else current

legalMoveFromNode = (node, from, to) ->
  position = parseFen node.fenAfter
  legalMoveOnPosition position, from, to

addOrSelectChild = (baseNode, move) ->
  existing = findExistingChild baseNode, move
  node = existing
  unless node?
    node = createNode baseNode, move, move.fenAfter
    baseNode.children.push node
  baseNode.selectedChildIndex = baseNode.children.indexOf node
  state.currentNode = node

undoLatest = ->
  return unless state.currentNode.parent?
  state.currentNode = state.currentNode.parent

loadFen = ->
  candidate = fenInput.value.trim()
  try
    engine = new Chess candidate
    state.acceptedFen = engine.fen()
    freshTree state.acceptedFen
    render()
  catch error
    window.alert "Ogiltig FEN:\n#{error.message}"
    fenInput.value = state.acceptedFen

acceptCurrentPosition = ->
  state.acceptedFen = state.currentNode.fenAfter
  fenInput.value = state.acceptedFen
  freshTree state.acceptedFen
  render()

resetTree = ->
  deleteCurrentSubtree()

pieceOnShownBoard = (square) ->
  parsePlacement(state.acceptedFen)[square]

boardEl.addEventListener "mousedown", (event) ->
  squareEl = event.target.closest ".square"
  return unless squareEl?
  square = squareEl.dataset.square

  return unless event.button is 0

  unless state.selectedFrom?
    state.selectedFrom = square
    render()
    return

  if state.selectedFrom is square
    state.selectedFrom = null
    render()
    return

  from = state.selectedFrom
  to = square
  state.selectedFrom = null
  if to isnt from
    baseNode = insertionBaseNodeForDrag from
    move = legalMoveFromNode baseNode, from, to
    addOrSelectChild baseNode, move if move?

  render()

pathEl.addEventListener "click", (event) ->
  nodeEl = event.target.closest ".tree-node[data-node-id]"
  return unless nodeEl?
  nodeId = Number nodeEl.dataset.nodeId
  node = findNodeById state.root, nodeId
  return unless node?
  state.currentNode = node
  render()

window.addEventListener "keydown", (event) ->
  switch event.key
    when "ArrowRight"
      goToNextMove()
      event.preventDefault()
    when "ArrowLeft"
      goToPreviousMove()
      event.preventDefault()
    when "ArrowUp"
      goToSibling -1
      event.preventDefault()
    when "ArrowDown"
      goToSibling 1
      event.preventDefault()
    when "Delete"
      deleteCurrentSubtree()
      event.preventDefault()

loadFenButton.addEventListener "click", loadFen
resetTreeButton.addEventListener "click", resetTree

fenInput.value = state.acceptedFen
freshTree state.acceptedFen
render()
