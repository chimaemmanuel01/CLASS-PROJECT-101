function squaresum(numbers){
    let total = 0;

    for (let num of numbers){
        total += num * num;
    }

    return total;
}

console.log(squaresum([1, 2, 2]));