import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "admin123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query(
    'select c.code from visits v join country_codes c on v.country_id = c.id join users u on v.user_id = u.id where u.id = $1', 
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.code);
  });
  return countries;
}

async function getUsers() {
  let users = []

  const response = await db.query('select * from users')

  response.rows.forEach(user => {
    users.push({
      id: user.id,
      name: user.name,
      color: user.color
    })
  });

  return users
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users = await getUsers();
  const response = await db.query('select color from users u where u.id = $1', [currentUserId])

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: response.rows[0].color
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT id FROM country_codes WHERE LOWER(name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const countryId = result.rows[0].id;

    try {
      await db.query(
        "INSERT INTO visits (user_id, country_id) VALUES ($1, $2)",
        [currentUserId, countryId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.user) {
    currentUserId = req.body.user
    res.redirect('/')
  } else res.render('new.ejs')
});

app.post("/new", async (req, res) => {
  const id = await db.query('insert into users(name, color) values($1, $2) returning id', [req.body.name, req.body.color])
  currentUserId = id.rows[0].id
  res.redirect('/')
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
