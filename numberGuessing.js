const prompt = require("prompt-sync")();

let secretNumber = Math.floor(Math.random() * 100) + 1;
let guessCount = 0;
let guess = 0;

while (guess !== secretNumber) {
    guess = Number(prompt("Guess a number between 1 and 100: "));
    guessCount++;

    if (guess > secretNumber) {
        console.log("Too high!");
    } else if (guess < secretNumber) {
        console.log("Too low!");
    } else {
        console.log("Correct!");
        console.log("You used " + guessCount + " guesses.");
    }
}