const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
//const process = require('./dev');
const mongodb = require('mongodb');

const port = process.env.PORT || 5000;

let game = null;
const levels = ['easy', 'intermediate', 'hard'];

(async () => {

const connectionString = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.gmcli.mongodb.net/minesweeper?retryWrites=true&w=majority`

const options = { useUnifiedTopology: true };
console.info('Conecting to MongoDB...');

const client = await mongodb.MongoClient.connect(connectionString, options);

const app = express();
app.use(bodyParser.json());
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

const games = client.db('minesweeper').collection('games');

function getValidGames () { return games.find({}).toArray(); }

function getGameByID (id) { return games.findOne({ _id: mongodb.ObjectId(id) }); }

function sortMinesPositions (minesNumber, rowsNumber, columnsNumber) {
  const minesPositions = Array(minesNumber);
  for (let i = 0; i < minesNumber; i++) {
    const index = Math.floor(Math.random() * rowsNumber * columnsNumber);
    if (!minesPositions.includes(index)) minesPositions[i] = index;
    else i--;
  }
  return minesPositions;
};

function sortMineSymbol () {
  const mines = ['\u2620','\u2622','\u2623'];
  const index = Math.floor(Math.random() * mines.length);
  return mines[index];
}

function verifyBody (verify, body) {

  if (verify.gameID) {
    if (game.gameID !== body.gameID)
      return {status: 'faileded', msg: `Game ${body.gameID} not found`};
  };

  if (verify.index) {
    if (typeof(body.index) !== "number")
      return {status: 'failed', msg: `Invalid type of index: ${typeof(body.index)}`};
    if (body.index < 0 || body.index > game.rowsNumber * game.columnsNumber)
      return {status: 'failed', msg: `Invalid index value: ${body.index}`};
  };

  if (verify.updates) {
    if (typeof(body.updates) !== "object")
      return {status: 'failed', msg: `Invalid type of updates: ${typeof(body.updates)}`};
    if (typeof(body.updates.indexes) !== "object")
      return {status: 'failed', msg: `Invalid type of updates indexes: ${typeof(body.updates.indexes)}`};
    if (typeof(body.updates.values) !== "object")
      return {status: 'failed', msg: `Invalid type of updates values: ${typeof(body.updates.values)}`};
    if (typeof(body.updates.indexes.length) !== "number")
      res.send({status: 'failed', msg: `Invalid type of updates indexes: Should be an Array`});
    if (typeof(body.updates.values.length) !== "number")
      res.send({status: 'failed', msg: `Invalid type of updates values: Should be an Array`});
  };

  if (verify.level) {
    if (!levels.includes(body.level))
      return {status: 'failed', msg: `Invalid level: ${body.level}`};
  };

  if (verify.win) {
    if (typeof(body.win) !== "boolean")
      return {status: 'failed', msg: `Invalid type of winning status: ${typeof(body.win)}`};
  }

  if (verify.rowsNumber || verify.columnsNumber || verify.minesNumber) {
    if (typeof(body.rowsNumber) !== "number")
      return {status: 'failed', msg: `Invalid type of the number of rows: ${typeof(body.rowsNumber)}`};
    if (body.rowsNumber <= 0)
      return {status: 'failed', msg: `Invalid number of rows: ${body.rowsNumber}`};
    if (typeof(body.columnsNumber) !== "number")
      return {status: 'failed', msg: `Invalid type of the number of columns: ${typeof(body.columnsNumber)}`};
    if (body.columnsNumber <= 0)
      return {status: 'failed', msg: `Invalid number of columns: ${body.columnsNumber}`};
    if (typeof(body.minesNumber) !== "number")
      return {status: 'failed', msg: `Invalid type of the number of mines: ${typeof(body.minesNumber)}`};
    if (body.minesNumber <= 0)
      return {status: 'failed', msg: `Invalid number of mines: ${body.minesNumber}`};
    if (body.minesNumber > body.rowsNumber * body.columnsNumber)
      return {status: 'failed', msg: `Invalid number of mines: ${body.minesNumber} > game-board (${
        body.rowsNumber * body.columnsNumber})`};
  };

  return null;
}



// ==================== Initialize a Game ======================================================== POST
app.post('/api/Init', async (req, res) => {

  // Validating Body ==================================================================================
  const message = verifyBody({minesNumber: true}, req.body);
  if (message) {
    res.send(message);
    return;
  };

  const { minesNumber, rowsNumber, columnsNumber } = req.body;

  // Sorting mines positions ==========================================================================
  const minesPositions = sortMinesPositions(minesNumber, rowsNumber, columnsNumber);

  // sorting mine symbol ==============================================================================
  const mineSymbol = sortMineSymbol();

  const stats = {
    playedEasy: 0,
    wonEasy: 0,
    playedIntermediate: 0,
    wonIntermediate: 0,
    playedHard: 0,
    wonHard: 0
  }

  game = {
    rowsNumber,
    columnsNumber,
    minesNumber,
    squaresValues: Array(rowsNumber * columnsNumber).fill(''),
    squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
    minesPositions,
    mineSymbol,
    stats
  };

  // Creating game ====================================================================================
  const { insertedCount, insertedId } = await games.insertOne(stats);

  // Validating creation ==============================================================================
  if (insertedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during creation of the game!'});
    return;
  }

  game.gameID = '' + insertedId; // String
  // Returning game id ================================================================================
  res.send({ status: 'ok', msg: `Game ${insertedId} created successfully`, gameID: insertedId});
});






// ==================== Get All Games ========================================================= GET ALL
app.get('/api/data', async (req, res) => {
  res.send({status: 'ok', msg: 'Returning all games', games: await getValidGames()});
});






// ==================== Open a Square and update state in the front-end =========================== PUT
app.put('/api/OpenSquare', async (req, res) => {

  if (!game) game = {gameID: "abc"}
  
  // Validating Body ==================================================================================
  const message = verifyBody({gameID: true, index: true, updates: true}, req.body);
  if (message) {
    res.send(message);
    return;
  };

  const { index, updates } = req.body;

  for (let i = 0; i < updates.indexes.length; i++) {
    game.squaresValues[updates.indexes[i]] = updates.values[i];
    if (updates.values[i] === '' || updates.values[i] === '?')
      game.squaresCSS[updates.indexes[i]] = '';
    else
      game.squaresCSS[updates.indexes[i]] = 'saved';
  }

  if (game.squaresCSS[index]) res.send({status: 'failed', msg: `Square ${index} was already opened`});
  else res.send({status: 'ok', msg: `Square ${index} opened successfully`, updates: OpenSquare(index)});
});







// ==================== EndGame =================================================================== PUT
app.put('/api/EndGame', async (req, res) => {

  if (!game) game = {gameID: "abc"}

  // Validating Body ==================================================================================
  const message = verifyBody({gameID: true, level: true, win: true }, req.body);
  if (message) {
    res.send(message);
    return;
  };

  const { gameID, level, win } = req.body;
  
  if (level === 'easy') {
    game.stats.playedEasy += 1;
    if (win) game.stats.wonEasy += 1;
  } else if (level === 'intermediate') {
    game.stats.playedIntermediate += 1;
    if (win) game.stats.wonIntermediate += 1;
  } else {
    game.stats.playedHard += 1;
    if (win) game.stats.wonHard += 1;
  }
  
  await games.updateOne(
    { _id: mongodb.ObjectId(gameID) },
    { $set: game.stats }
  );

  res.send({status: 'ok', msg: `Game ${gameID} stats updated`});
});








// ==================== Restart the Game ========================================================== PUT
app.put('/api/Restart', async (req, res) => {
  const { gameID } = req.body;
  let stats;

  // Validating id ====================================================================================
  if (!game) {
    game = {}
    stats = await getGameByID(gameID);
    if (!stats) {
      res.send({status: 'failed', msg: `Game ${gameID} not found`});
      return;
    }
    game.gameID = '' + stats._id; //String
    delete stats._id;
    game.stats = stats;
  }

  // Validating Body ==================================================================================
  const message = verifyBody({gameID: true, minesNumber: true}, req.body);
  if (message) {
    res.send(message);
    return;
  };

  const { minesNumber, rowsNumber, columnsNumber } = req.body;
  stats = game.stats;

  // Sorting mines positions ==========================================================================
  const minesPositions = sortMinesPositions(minesNumber, rowsNumber, columnsNumber);

  // Sorting mine symbol ==============================================================================
  const mineSymbol = sortMineSymbol();

  // Reseting game ====================================================================================
  game = {
    gameID,
    rowsNumber,
    columnsNumber,
    minesNumber,
    squaresValues: Array(rowsNumber * columnsNumber).fill(''),
    squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
    minesPositions,
    mineSymbol,
    stats,
  };

  res.send({ status: 'ok', msg: `Game ${gameID} restarted succesfuly`});
});






// ==================== Remove Game ============================================================ DELETE
app.delete('/api/remove', async (req, res) => {
  const gameID = req.body.gameID;

  // Validating id ====================================================================================
  if (await games.countDocuments({ _id: mongodb.ObjectId(gameID) }) !== 1) {
    res.send({status: 'failed', msg: `Game ${gameID} not found`});
    return;
  }

  // Deleting =========================================================================================
  const { deletedCount } = await games.deleteOne({ _id: mongodb.ObjectId(gameID) });

  // // Validating deletion ===========================================================================
  if (deletedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during deletion of the game!'});
    return;
  }
  res.send({status: 'ok', msg: `Game ${gameID} deleted`});
});


// "Catchall" handler: for any request that doesn't match
// the ones above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});



app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})
})();













function CountMines (index) {
  const { rowsNumber, columnsNumber, minesPositions } = game;

  // index = row * columnsNumber + column
  // index/columnsNumber = row (quotient) + column/columnsNumber (remainder)
  const rowInit = Math.floor(index / columnsNumber);
  const columnInit = index % columnsNumber;
  let positions = [];

  for (let row = rowInit - 1; row < rowInit + 2; row++) {
      if (row < 0 || row > rowsNumber - 1) continue;
      for (let column = columnInit -1; column < columnInit + 2; column++) {
          if (row === rowInit && column === columnInit) continue;
          if (column < 0 || column > columnsNumber - 1) continue;
          positions.push(row * columnsNumber + column);
      }
  }

  // Count mines in adjacent squares
  let mines = 0;
  for (const position of positions) if (minesPositions.includes(position)) mines++;

  // return the number of mines and the valid positions around index
  return([mines, positions]);
}

function OpenAllSquares () {
  const { squaresValues, squaresCSS, minesPositions, mineSymbol } = game;
  updates = {indexes: [], values: []};

  for (let index = 0, length = squaresValues.length; index < length; index++) {
      if (!squaresCSS[index] || squaresCSS[index] === 'saved') {
          updates.indexes.push(index);
          if (minesPositions.includes(index))
              squaresValues[index] = squaresCSS[index] === 'saved' ? '\u2713' : mineSymbol;
          else if (squaresCSS[index] === 'saved')
              squaresValues[index] = '\u2717';
          else if (!squaresCSS[index])
              [squaresValues[index]] = CountMines(index);
          updates.values.push(squaresValues[index]);
      }
  }
  return updates;
}

function OpenSquare (index) {
  const cssClasses = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const { minesPositions, squaresValues, squaresCSS } = game;

  if (minesPositions.includes(index)) return OpenAllSquares();

  let updates = {indexes: [index], values: []};
  let positions = [];
  let i = 0;
  
  while (true) {
      // if square was not clicked
      //if (!squaresCSS[updates.indexes[i]]) {
          // Count mines around the square, update value with the number of mines
          // and squaresCSS with 'clicked ' + the number of mines as text
          // positions keep the indexes of the squares around
          [updates.values[i], positions] = CountMines(updates.indexes[i]);
          squaresValues[updates.indexes[i]] = updates.values[i] ? updates.values[i] : '';
          squaresCSS[updates.indexes[i]] = 'cliqued ' + cssClasses[updates.values[i]];
          if (!squaresValues[updates.indexes[i]]) {
              for (const pos of positions) if (!updates.indexes.includes(pos) && !squaresCSS[pos]) updates.indexes.push(pos);
          }
      //}
      if (i < updates.indexes.length - 1) i++;
      else return updates;
  }
};