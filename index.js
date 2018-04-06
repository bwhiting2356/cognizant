const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,

    // SQLite only
    storage: DB_PATH
});

const Genres = sequelize.define('genres', { // TODO: should this be plural or singular?
    name: Sequelize.STRING,
},{
    timestamps: false
});

const Films = sequelize.define('films', {
    title: Sequelize.STRING,
    release_date: Sequelize.STRING,
    tagline: Sequelize.STRING,
    revenue: Sequelize.INTEGER,
    budget: Sequelize.INTEGER,
    runtime: Sequelize.INTEGER,
    original_language: Sequelize.STRING,
    status: Sequelize.STRING,
},{
    timestamps: false
});

Films.belongsTo(Genres, {foreignKey: 'genre_id'});

const Artists = sequelize.define('artists', {
    name: Sequelize.STRING,
    birthday: Sequelize.STRING,
    deathday: Sequelize.STRING,
    gender: Sequelize.INTEGER,
    place_or_birth: Sequelize.STRING,
},{
    timestamps: false
});

const ArtistsFilms = sequelize.define('artists_films', {
    credit_type: Sequelize.STRING,
    role: Sequelize.STRING,
    description: Sequelize.STRING,
},{
    timestamps: false
});

ArtistsFilms.belongsTo(Films, {foreignKey: 'film_id'});
ArtistsFilms.belongsTo(Artists, {foreignKey: 'artist_id'});

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('/*', errorRouteHandler);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  const { id } = req.params;
  let { limit, offset } = req.query;

  if (isNaN(id)) {
    res.statusCode = 422;
    res.json({ message: "Invalid film id"})
    return
  }

  if (limit && isNaN(limit)) {
    res.statusCode = 422;
    res.json({ message: "Invalid limit parameter"});
    return
  }

  if (offset && isNaN(offset)) {
    res.statusCode = 422;
    res.json({ message: "Invalid offset parameter"});
    return
  }

  // set defaults
  limit = limit || 10;
  offset = offset || 0;

  let releaseDate;

  Films.findById(id)
    .then(film => {
      if (!film) {
        throw new Error("no film exists with this id")
      }
      releaseDate = new Date(film.release_date);// store this variable in outer scope for use later

      // Find all films with the same genre
      // TODO: exclude the film itself from its own recommendations
      return Films.findAll({ where: { genre_id: film.genre_id }, include: [Genres]})
    })
    .then(films => {
      return films.filter(film => withinFifteenYears(film, releaseDate)); // only within fifteen years
    })
    .then(films => {
      const response = {
        recommendations: [],
        meta: {
          limit,
          offset
        }
      };

      res.json(films)
    })
    .catch(err => {
      res.statusCode = 500;
      res.json({ message: err.message });
    })
}

// ERROR ROUTE HANDLER

function errorRouteHandler(req, res) {
  res.statusCode = 404;
  res.json({message: 'not a valid route'})
}

// ********** HELPER FUNCTIONS **********

// WITHIN FIFTEEN YEARS

function withinFifteenYears(otherFilm, parentFilm) {
  const otherFilmDate = new Date(otherFilm.release_date);
  return otherFilmDate >= fifteenYearsEarlier(parentFilm) || otherFilmDate <= fifteenYearsLater(parentFilm);
}

function fifteenYearsEarlier(date) {
  const year = date.getFullYear();
  const earlier = new Date(date);
  earlier.setFullYear(year - 15);
  return earlier;
}

function fifteenYearsLater(date) {
  const year = date.getFullYear();
  const later = new Date(date);
  later.setFullYear(year + 15);
  return later;
}

module.exports = app;
