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

  Films.findById(id)
      .then(film => {
          const response = {
              recommendations: [],
              meta: {
                  limit,
                  offset
              }
          };

          res.json(response)
      });
}

module.exports = app;
