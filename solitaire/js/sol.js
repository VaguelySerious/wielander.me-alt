// TODO Implement scoreboard
// TODO Fix undo
// TODO Fix time starting too early
// TODO Fix time too fast

// ////////////////////
// GLOBAL VARIABLES //
// ////////////////////

SOL.stats = {
  score: 0,
  moves: 0,
  started: false,
  time: {
    now: 0,
    interval: null
  },
  // Array of {score, time, timeBonus, moves, wasWin}
  scores: []
};
SOL.DOM = {

    // General
    board: document.getElementById('board'),
    stacks: document.getElementsByClassName('stack'),

    // Buttons
    undo: document.getElementById('undo'),
    newgames: document.getElementsByClassName('new-game'),

    // Text info
    // timer: document.getElementById('printinfo'),
    // score: document.getElementById('printinfo'),

    scoreboard: {
      gameScore: document.getElementById('scoreboard-score'),
      gameBonus: document.getElementById('scoreboard-bonus'),
      gameTotal: document.getElementById('scoreboard-total'),
      gameTime: document.getElementById('scoreboard-time'),

      highScore: document.getElementById('scoreboard-highscore'),
      gamesCount: document.getElementById('scoreboard-gamesCount'),
      gamesWonCount: document.getElementById('scoreboard-gamesWonCount'),
    }
};
SOL.cardColors = [
  'yellow',
  'orange',
  'red',
  'purple',
  'lavender',
  'blue',
  'aqua',
];

// Create modals
// modal_menu = new Modal('menu', 'visible', 'menu-toggle');
modal_help = new Modal('help', 'visible', 'help-toggle');
modal_score = new Modal('scoreboard', 'visible', 'score-toggle');
modal_cookie = new Modal('cookie', 'hidden', 'cookie-toggle');

// Create object with dynamic dom bindings
function Modal(modalID, visibleClass, toggles) {
  this.modal = document.getElementById(modalID);
  this.visibleClass = visibleClass;

  console.log(this)
  console.log(this.toggle)

  if (typeof toggles === 'string') {
    var toggleNodes = document.getElementsByClassName(toggles);

    for (var i = 0; i < toggleNodes.length; i++){
      // toggleNodes[i].addEventListener('click', this.toggle.bind(this));
      toggleNodes[i].addEventListener('click', () => {
        this.modal.classList.toggle(this.visibleClass);
      })
    }
  } else {
    for (var i = 0; i < toggles.length; i++){
      // document.getElementById(toggles[i]).addEventListener('click',
        // this.toggle.bind(this));
      document.getElementById(toggles[i]).addEventListener('click', () => {
        this.toggle();
        // this.modal.classList.toggle(this.visibleClass);
      });
    }
  }
}

Modal.prototype.toggle = function(){ // this is undefined
  this.modal.classList.toggle(this.visibleClass);
};

// Generates a DOM Node from card object
SOL.generate = function (card) {
  return sprintf(
    SOL.template,
    card.value,
    card.color,
    card.facedown ? 'facedown' : '',
    card.id
  );
};

// Get the card object from the id
SOL.lookup = function (id) {
  var i;
  var j;
  for (i = 0; i < SOL.game.stacks.length; i++) {
    for (j = 0; j < SOL.game.stacks[i].length; j++) {
      if (SOL.game.stacks[i][j] && SOL.game.stacks[i][j].id === id) {
        return {
          card: SOL.game.stacks[i][j],
          stack: i,
          pos: j
        }
      }
    }
  }
  throw new Error('Lookup could not find the card by ID');
};

// Adds a card to bottom of stack
SOL.push = function (stack, card) {
  var domCard = SOL.generate(card);
  SOL.game.stacks[stack].push(card);
  SOL.DOM.stacks[stack].insertAdjacentHTML('beforeend', SOL.generate(card));
};

// Removes a card from bottom of stack
// Returns the id of the removed card
SOL.pop = function (stack) {
  var children = SOL.DOM.stacks[stack].childNodes;

  if (SOL.game.stacks[stack].length > 0 && children.length > 0) {
    SOL.DOM.stacks[stack].removeChild(children[children.length - 1]);
    return SOL.game.stacks[stack].pop();
  } else {
    throw new Error('Cannot pop empty stack');
  }
};

// Moves a card from one location to another
SOL.move = function (from, to, amount, flip, reverse) {
  var cards = [];
  var i;

  // Remove the cards from the origin stack
  for (i = 0; i < amount; i++) {
    cards.push(SOL.pop(from));

    if (flip) {
      cards[i].facedown = !cards[i].facedown;
    }
  }

  // Push the cards to the target stack
  for (i = 0; i < amount; i++) {
    if (reverse) {
      SOL.push(to, cards.shift());
    } else {
      SOL.push(to, cards.pop());
    }
  }

  return cards[cards.length - 1] != null;
};

// Create new deck
SOL.new = function () {
  var deck = [];
  var tempNumber = '';
  var currentStack = 0;
  var tempIsFacedown = true;
  var len;

  SOL.stats.time.stop();
  SOL.stats.time.reset();

  // Add stats
  if (SOL.stats.started) {
    SOL.addStats(false);
  }

  // Reset stats
  SOL.stats.time.reset();
  SOL.stats.started = false;
  SOL.stats.moves = 0;
  SOL.stats.score = 0;
  SOL.game.cycleTimes = SOL.game.maxCycleTimes;
  SOL.DOM.undo.setAttribute('disabled', 'true');
  SOL.DOM.stacks[0].classList.remove('error');
  document.cookie = 'gamestate=;';

  for (var i = 0, len = SOL.game.cards; i < len; i++) {
    deck.push({
      id: i,
      color: SOL.game.colors[i % SOL.game.colors.length],
      value: i % 13,
      facedown: true
    });
  }

  for (var k = 0; k < SOL.game.stacks.length; k++) {
    SOL.game.stacks[k] = [];
  }

  SOL.clear();
  SOL.shuffle(deck);

  // Parse the fen string
  for (var i = 0, len = SOL.game.distribution.length; i < len; i++) {
    if (/[0-9]/.test(SOL.game.distribution[i])) {
      tempNumber += SOL.game.distribution[i];
    } else {
      switch (SOL.game.distribution[i]) {
      case '/':
        currentStack++;
        break;

      case 'u':
        tempIsFacedown = false;
        // falls through
      case 'd':
        for (j = 0; j < +tempNumber; j++) {
          var tempCard = deck.pop();
          tempCard.facedown = tempIsFacedown;
          SOL.push(currentStack, tempCard);
        }

        tempIsFacedown = true;
        break;

      default:
        throw new Error('Invalid fen string for cards distribution');
      }

      tempNumber = '';
    }
  }
};

// Clear the board stacks
SOL.clear = function() {
  for (var i = 0; i < SOL.DOM.stacks.length; i++) {
    SOL.DOM.stacks[i].innerHTML = '';
  }
}

// Rebuilds DOM from stack variable
SOL.rebuild = function () {
  var i;
  var j;

  SOL.clear();

  // Refill from stack variable
  for (var i = 0; i < SOL.DOM.stacks.length; i++) {
    for (var j = 0; j < SOL.game.stacks[i].length; j++) {
      var domCard = SOL.generate(SOL.game.stacks[i][j]);
      SOL.DOM.stacks[i].insertAdjacentHTML('beforeend', domCard);
    }
  }
};

// Go back in time once and update score
SOL.undo = function () {
  if (SOL.game.history.length > 0) {
    var lastState = JSON.parse(SOL.game.history.pop());

    SOL.stats.moves += 1;
    SOL.game.stacks = lastState.stacks;
    SOL.stats.score = lastState.score + SOL.scoring.undo;

    SOL.rebuild();

    // Last available gamestate, disable the button
    if (SOL.game.history.length <= 0) {
      SOL.DOM.undo.setAttribute('disabled', 'true');
    }
  } else {
    throw new Error('Undo unavailable');
  }
};

// Creates a gamestate and pushes it to cookies
SOL.save = function () {
  if (!SOL.stats.started) {
    SOL.stats.time.stop();
    SOL.stats.time.reset();
    SOL.stats.time.start();
    SOL.stats.started = true;
  }

  SOL.stats.moves += 1;
  var state = JSON.stringify({
    score: SOL.stats.score,
    time: SOL.stats.time.now,
    moves: SOL.stats.moves,
    stacks: SOL.game.stacks,
    cycleTimes: SOL.game.cycleTimes
  });

  SOL.game.history.push(state);
  document.cookie = 'gamestate=' + state + ';';
  document.cookie = 'stats=' + JSON.stringify(SOL.stats.scores) + ';';

  if (SOL.game.history.length > SOL.game.maxGameStates) {
    SOL.game.history.shift();
  }

  // Game is undoable, so enable the button
  if (SOL.game.history.length >= 1
      && SOL.game.history[SOL.game.history.length - 1] !== SOL.game.stacks) {
    SOL.DOM.undo.removeAttribute('disabled');
  }
};

// Calculates score and shows win screen / stats
SOL.win = function () {
  SOL.addStats(true);
  SOL.stats.time.stop();
  modal_score.toggle();

  document.cookies = 'gamestate=;';

  var avgScore = 0;
  var gamesWon = 0;
  var gamesPlayed = SOL.stats.scores.length;
  var timeBonus = 0;
  var highScore = 0;
  var bestTime = 100000000;

  for (var i = 0; i < SOL.stats.scores; i++) {
    avgScore += SOL.stats.scores[i].score;
    gamesWon += SOL.stats.scores[i].wasWin;
    if (SOL.stats.score[i].score > highScore) {
      highScore = SOL.stats.scores[i].score;
    }
    if (SOL.stats.score[i].time.now < bestTime) {
      bestTime = SOL.stats.scores[i].time.now;
    }
  }

  avgScore /= gamesWon;

  SOL.DOM.scoreboard.gameScore.textContent = SOL.stats.score;
  SOL.DOM.scoreboard.gameBonus.textContent = Math.round(SOL.scoring.timeBonus / SOL.stats.time.now);
  SOL.DOM.scoreboard.gameTotal.textContent = SOL.stats.score + Math.round(SOL.scoring.timeBonus / SOL.stats.time.now);
  SOL.DOM.scoreboard.gameTime.textContent  = (SOL.stats.time.now / 3600 >= 1 ? Math.floor(SOL.stats.time.now / 3600) + ':' : '') +
      (Math.floor(SOL.stats.time.now / 60) % 60).toString().padStart(2, '0') + ':' +
      (SOL.stats.time.now % 60).toString().padStart(2, '0');

  SOL.DOM.scoreboard.highScore.textContent = highScore;
  SOL.DOM.scoreboard.gamesCount.textContent = gamesPlayed;
  SOL.DOM.scoreboard.gamesWonCount.textContent = gamesWon;
  SOL.stats.started = false;
  modal_score.toggle();
};

SOL.addStats = function(won) {
  won = won || false;
  var stats = {
    wasWin: won
  }
  if (won) {
    stats.score = SOL.game.score;
    stats.time = SOL.stats.time.now;
    stats.moves = SOL.stats.moves;
  }
  var length = SOL.stats.scores.push(stats);

  SOL.DOM.scoreboard.gameScore.textContent = SOL.stats.scores[length - 1].score;
  // SOL.DOM.scoreboard.gameBonus.
};

// Checks if two cards have different colors
SOL.differentColor = function (color1, color2) {
  return (SOL.game.colors.indexOf(color1) > 1
      && SOL.game.colors.indexOf(color2) < 2)
    || (SOL.game.colors.indexOf(color1) < 2
      && SOL.game.colors.indexOf(color2) > 1)
};

// Highlight certain card
SOL.highlight = function (cardInfo) {
  document.getElementById(cardInfo.card.id).classList.add('clicked');
};

// Dehighlight certain card
SOL.dehighlight = function (cardInfo) {
  document.getElementById(cardInfo.card.id).classList.remove('clicked');
};


// /////////////////
// TIME SCORE DOM //
// /////////////////

// Updates score in DOM
SOL.stats.updateScore = function (change, set) {
  if (typeof set === 'number') {
    this.score = set;
  } else {
    this.score += change;
  }
  // SOL.DOM.score.innerHTML = this.score;
};

// Updates time in DOM
SOL.DOM.updateTime = function (seconds) {
  // SOL.DOM.timer.innerHTML = (seconds / 3600 >= 1 ? Math.floor(seconds / 3600) + ':' : '') +
  // (Math.floor(seconds / 60) % 60).toString().padStart(2, '0') + ':' +
  // (seconds % 60).toString().padStart(2, '0');
};

// Starts the timer interval
SOL.stats.time.start = function () {
  this.timer = setInterval(function () {
    SOL.stats.time.now += 1;
    if (SOL.stats.time.now % 10 === 0) {
      SOL.stats.updateScore(SOL.scoring.afterTenSeconds);
    }
    // SOL.DOM.updateTime(SOL.stats.time.now);
  }, 1000);
};

// Only stops the timer
SOL.stats.time.stop = function () {
  clearInterval(this.timer);
  this.timer = null;
};

// Only sets the timer to zero
SOL.stats.time.reset = function () {
  SOL.stats.time.now = 0;
  // SOL.DOM.updateTime(0);
};


// /////////////////
// TIME SCORE DOM //
// /////////////////

// Sprintf
function sprintf(text) {
  var i = 1;
  var args = arguments;
  return text.replace(/%s/g, function () {
    return i < args.length ? args[i++] : '';
  });
}

// Template for card DOM objects
SOL.template = '<div class="card card-%s %s %s" id="%s"><div class="card__front"><span class="card__values"></span></div><div class="card__back"></div></div>';

// Shuffles an array in place (CBR)
SOL.shuffle = function (arr) {
  var j;
  var temp;
  var i;
  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
};



// ///////////////
// DOM BINDINGS //
// ///////////////

document.body.addEventListener("click", function(event){
  if (event.target.classList.contains('card')){
    SOL.clickCard(SOL.lookup(+event.target.id));
  } else if (event.target.classList.contains('stack')) {
    SOL.clickStack(+event.target.id.slice(event.target.id.indexOf('-')+1));
  }
});

SOL.DOM.undo.addEventListener('click', function() {
  SOL.undo();
});
for (var i = 0; i < SOL.DOM.newgames.length; i++){
  SOL.DOM.newgames[i].addEventListener('click', function() {
    SOL.new();
  });
}

document.onkeypress = function(e){
  switch(e.which) {
    // CTRL-Z, U
    case 26: // Falls through
    case 85: SOL.undo();
    break;
    // N
    case 110: SOL.new();
    break;
    // H
    case 104: SOL.modal_help.toggle();
    break;
    // M
    case 109: SOL.modal_menu.toggle();
    break;
    // S
    case 115: SOL.modal_score.toggle();
    break;
  }
};


// ////////////
// MAIN CODE //
// ////////////

// Assign random color to cards
document.body.className += SOL.cardColors[Math.floor(Math.random() * SOL.cardColors.length)];

// Function for parsing cookies
function parseCookieStringAsJson (string) {
  var ret = {};
  var lastIndex = 0;
  var lastName = null;

  for (var i = 0; i < string.length; i++) {
    if (string[i] === '=') {
      lastName = string.slice(lastIndex, i);
      ret[lastName] = null;
      lastIndex = i + 1;
    } else if (string[i] === ';') {
      ret[lastName] = JSON.parse(string.slice(lastIndex, i));
      lastIndex = i + 2;
      lastName = null;
    } else if (i === string.length-1 && lastName !== null) {
      ret[lastName] = JSON.parse(string.slice(lastIndex));
    }
  }
  return ret;
}

// // Read out cookies
var SOL_cookie_save = parseCookieStringAsJson(document.cookie);
if (SOL_cookie_save.scores) {
  SOL.stats.scores = SOL_cookie_save.scores;
}
if (SOL_cookie_save.gamestate) {
  SOL.game.stacks = SOL_cookie_save.gamestate.stacks;
  SOL.game.cycleTimes = SOL_cookie_save.gamestate.cycleTimes;
  SOL.stats.score = SOL_cookie_save.gamestate.score;
  SOL.stats.time.now = SOL_cookie_save.gamestate.time;
  SOL.stats.moves = SOL_cookie_save.gamestate.moves;
  SOL.stats.started = true;
  if (SOL.game.cycleTimes <= 0) {
    SOL.DOM.stacks[0].classList.add('error');
  }
  SOL.stats.time.start();
  SOL.rebuild();
} else {
  SOL.new();
}
