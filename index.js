var mysql = require("mysql2");
var inquirer = require("inquirer");

// create the connection information for the sql database

var connection = mysql.createConnection({
  host: "localhost",

  // Your port; if not 3306
  port: 3306,

  // Your username
  user: "root",

  // Your password
  password: "",
  database: "greatBay_DB",
});


// connect to the mysql server and sql database
connection.connect(function (err) {
  if (err) throw err;
  // run the start function after the connection is made to prompt the user
  start();
});

// function which prompts the user for what action they should take
function start() {
  inquirer
    .prompt({
      name: "postOrBid",
      type: "list",
      message: "Would you like to [POST] an auction or [BID] on an auction?",
      choices: ["POST", "BID", "EXIT"]
    })
    .then(function (answer) {
      // based on their answer, either call the bid or the post functions
      if (answer.postOrBid === "POST") {
        postAuction();
      }
      else if (answer.postOrBid === "BID") {
        bidAuction();
      } else {
        connection.end();
      }
    });
}

// function to handle posting new items up for auction
function postAuction() {
  // prompt for info about the item being put up for auction
  inquirer
    .prompt([
      {
        name: "item",
        type: "input",
        message: "What is the item you would like to submit?"
      },
      {
        name: "category",
        type: "input",
        message: "What category would you like to place your auction in?"
      },
      {
        name: "startingBid",
        type: "input",
        message: "What would you like your starting bid to be?",
        validate: function (value) {
          if (isNaN(value) === false) {
            return true;
          }
          return false;
        }
      }
    ])
    .then(function (answer) {
      runQuery("INSERT INTO auctions SET ?", {
        item_name: answer.item,
        category: answer.category,
        starting_bid: answer.startingBid || 0,
        highest_bid: answer.startingBid || 0
      }, createItem, answer)
    });
}

//actions

function createItem(res, ans) {
  console.log(ans)
  console.log(`Your ${ans.item} was created successfully!`)
  start()
}

function placeBid(res) {
  console.log(res[0].info)
  console.log("Bid placed successfully!")
  start()
}

function getChoiceArr(res) {
  const choiceArray = []
  for (var i = 0; i < res[0].length; i++) {
    choiceArray.push(res[0][i].item_name);
  }
  return choiceArray
}

function getChosen(res, ans) {
  var item
  for (var i = 0; i < res[0].length; i++) {
    if (res[0][i].item_name === ans.choice) {
      item = res[0][i]
    }
  }
  return item
}

//async queries

async function runQuery(sql, ins, action, args) {
  try {
    const res = await connection.promise().query(sql, ins)
    return action(res, args)
  } catch (e) {
    console.error(e)
  }
}

//console.log tester queries

function getAll() {
  runQuery('SELECT * FROM auctions', {}, function (res) { console.log(res[0]) })
}

function clear() {
  runQuery('DELETE FROM auctions', {}, function (res) { console.log(`\n Deleted ${res[0].affectedRows} rows`) })
}

clear()

//bidding

function bidAuction() {
  // query the database for all items being auctioned
  // connection.query("SELECT * FROM auctions", function (err, results) {
  //   if (err) throw err;
  // once you have the items, prompt the user for which they'd like to bid on
  inquirer
    .prompt([
      {
        name: "choice",
        type: "rawlist",
        choices: function () {
          return runQuery('SELECT * from auctions', {}, getChoiceArr)
        },
        message: "What auction would you like to place a bid in?"
      },
      {
        name: "bid",
        type: "input",
        message: "How much would you like to bid?"
      }
    ])
    .then(function (answer) {
      console.log("choice", answer.choice)
      runQuery('SELECT * from auctions', {}, getChosen, answer).then(chosenItem => {
        console.log('chosenItem', chosenItem)
        if (chosenItem.highest_bid < parseInt(answer.bid)) {
          // bid was high enough, so update db, let the user know, and start over
          runQuery("UPDATE auctions SET ? WHERE ?", [
            {
              highest_bid: answer.bid
            },
            {
              id: chosenItem.id
            }
          ], placeBid)
        }
        else {
          // bid wasn't high enough, so apologize and start over
          console.log("Your bid was too low. Try again...");
          start();
        }

      })

    })
}
