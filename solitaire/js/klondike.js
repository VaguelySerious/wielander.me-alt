// TODO Errorflash
// TODO Apply all scores

var SOL = {};

// General
SOL.game = {

  // Settings
  maxGameStates: 1,
  progressiveUndo: 1,
  maxCycleTimes: 2,
  cycleTimes: 0,
  minTime: 30,

  // Board information
  cards: 52,
  colors: ['hearts', 'diamonds', 'clubs', 'spades'],
  stacks: [[], [], [], [], [], [], [], [], [], [], [], [], []],
  distribution: '24d//////1u/1d1u/2d1u/3d1u/4d1u/5d1u/6d1u',
  history: [],

  // Logic
  activeCard: null,
  possibleMove: true,
  autoCompletable: false
};

// Scoring rules
SOL.scoring = {
  pileToTableau: 5,
  tableauToFoundation: 10,
  undo: -10,
  foundationToTableau: -15,
  uncoverFaceDown: 5,
  afterTenSeconds: -2,
  timeBonus: 700000
};


// Resolve rules for clicking on card
SOL.clickCard = function (cardInfo) {
  var wasOnlyHighlight = false;

  SOL.save();

  // Clicking on deck
  if (cardInfo.stack === 0) {
    if (SOL.game.stacks[0].length < 3) {
      SOL.move(0, 1, SOL.game.stacks[0].length, true, true);
    } else {
      SOL.move(0, 1, 3, true, true);
    }
    SOL.deselectLast();

  // Uncover face down card
  } else if (cardInfo.card.facedown) {
    SOL.stats.updateScore(SOL.scoring.uncoverFaceDown);
    cardInfo.card.facedown = false;
    document.getElementById(cardInfo.card.id).classList.remove('facedown');
    SOL.deselectLast();

  // Select card
  } else if (SOL.game.activeCard === null) {
    SOL.game.activeCard = cardInfo;
    SOL.highlight(cardInfo);

  // Deselect on same-card-twice or push to foundation
  } else if (SOL.game.activeCard.card === cardInfo.card) {
    // Moving ace to foundation
    if (SOL.game.activeCard.card.value === 0) {
      for (var j = 2; j < 6; j++) {
        if (SOL.game.stacks[j].length === 0) {
          SOL.move(SOL.game.activeCard.stack, j, 1);
          break;
        }
      }
    // Moving other card to foundation
    } else {
      for (var j = 2; j < 6; j++) {
        if (SOL.game.stacks[j].length !== 0) {
          var lastCard = SOL.game.stacks[j][SOL.game.stacks[j].length - 1]
          if (SOL.game.activeCard.card.value === lastCard.value + 1
            && SOL.game.activeCard.card.color === lastCard.color){
            SOL.move(SOL.game.activeCard.stack, j, 1);
            break;
          }
        }
      }
    }
    SOL.deselectLast();

  // Let two cards interact
  } else {
    SOL.highlight(cardInfo);

    // Card is higher and different color
    if (SOL.game.activeCard.card.value === cardInfo.card.value - 1
      && SOL.differentColor(SOL.game.activeCard.card.color, cardInfo.card.color)
      && cardInfo.stack > 5) {
      SOL.move(
        SOL.game.activeCard.stack,
        cardInfo.stack,
        SOL.game.stacks[SOL.game.activeCard.stack].length - SOL.game.activeCard.pos
      );

    // Wrong selection
    } else if (SOL.game.activeCard.card.value === cardInfo.card.value + 1
      && SOL.game.activeCard.card.color === cardInfo.card.color
      && cardInfo.stack > 1 && cardInfo.stack < 6){
      SOL.move(SOL.game.activeCard.stack, cardInfo.stack, 1);
    } else {
      // TODO Errorflash
    }

    setTimeout(function () {
      SOL.deselectLast();
      SOL.dehighlight(cardInfo);
    }, 300);
  }

  SOL.check();
};

// Make a move
SOL.clickStack = function (stack) {
  SOL.save();

  // Cycle the deck once round
  if (stack === 0) {

    if (SOL.game.cycleTimes > 0) {
      SOL.move(1, 0, SOL.game.stacks[1].length, true, true);
      SOL.game.cycleTimes -= 1;
      if (SOL.game.cycleTimes <= 0) {
        SOL.DOM.stacks[0].classList.add('error');
      }
    }

  // Move to foundation
  } else if (SOL.game.activeCard
    && SOL.game.activeCard.card.value === 0
    && stack > 1 && stack < 6) {
    SOL.move(SOL.game.activeCard.stack, stack, 1);

  // Move Kings to empty stack
  } else if (SOL.game.activeCard
    && SOL.game.activeCard.card.value === 12
    && stack > 5) {
    SOL.move(SOL.game.activeCard.stack, stack,
      SOL.game.stacks[SOL.game.activeCard.stack].length - SOL.game.activeCard.pos);
  } else {
    // Error flash
  }
  setTimeout(function () {
      SOL.deselectLast();
  }, 300);
};


// Check for win or autocompleteabilty
SOL.check = function () {
  var won = true;
  for (var i = 2; i < 6; i++) {
    if (SOL.game.stacks[i].length < 13) {
      won = false;
      break;
    }
  }
  if (won) {
    SOL.win();
  }
};

// Move all cards to wincondition
SOL.complete = function () {
  // SOL.game.stacks = [[],[],[a],[a],[a],[a]]
  SOL.rebuild();
};

// Deselect Active Card
SOL.deselectLast = function () {
  if (SOL.game.activeCard !== null) {
    SOL.dehighlight(SOL.game.activeCard);
    SOL.game.activeCard = null;
  }
};

