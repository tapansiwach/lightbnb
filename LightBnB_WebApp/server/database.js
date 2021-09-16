const { Pool } = require('pg');

const pool = new Pool({
  user: 'tapansiwach',
  host: 'localhost',
  database: 'lightbnb'
});

const properties = require('./json/properties.json');
const users = require('./json/users.json');

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithEmail = function(email) {
//   let user;
//   for (const userId in users) {
//     user = users[userId];
//     if (user.email.toLowerCase() === email.toLowerCase()) {
//       break;
//     } else {
//       user = null;
//     }
//   }
//   return Promise.resolve(user);
// }
const getUserWithEmail = function(email) {
  return pool.query(`
  SELECT * FROM users 
  WHERE email = $1
  `, [email])
    .then(res => res.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithId = function(id) {
//   return Promise.resolve(users[id]);
// }
const getUserWithId = function(id) {
  return pool.query(`
  SELECT * FROM users 
  WHERE id = $1
  `, [id])
    .then(res => res.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
// const addUser = function(user) {
//   const userId = Object.keys(users).length + 1;
//   user.id = userId;
//   users[userId] = user;
//   return Promise.resolve(user);
// }
const addUser = function(user) {
  return pool.query(`
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3) RETURNING *
  `, [user.name, user.email, user.password])
    .then(res => res.rows[0])
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
// const getAllReservations = function(guest_id, limit = 10) {
//   return getAllProperties(null, 2);
// }
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
  SELECT * 
  FROM reservations
    JOIN properties ON reservations.property_id = properties.id
  WHERE guest_id = $1
  LIMIT 10
  `, [guest_id])
    .then(res => res.rows)
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function(options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// }

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `
    WHERE city LIKE $${queryParams.length} 
    `
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += (queryString.length > 150) ? 'AND ' : 'WHERE ';
    queryString += `
    properties.owner_id = $${queryParams.length} 
    `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += (queryString.length > 150) ? 'AND ' : 'WHERE ';
    queryString += `
    properties.cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} 
    `;
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += (queryString.length > 150) ? 'AND ' : 'WHERE ';
    queryString += `
    property_reviews.rating >= $${queryParams.length} 
    `;
  }

  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY properties.cost_per_night
  LIMIT $${queryParams.length}
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams)
    .then(res => res.rows)
    .catch(error => {
      console.log(error.message);
    })
}
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
// const addProperty = function(property) {
//   const propertyId = Object.keys(properties).length + 1;
//   property.id = propertyId;
//   properties[propertyId] = property;
//   return Promise.resolve(property);
// }
const addProperty = function(property) {
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url || '',
    property.cover_photo_url || '',
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];

  // console.log(values);

  return pool.query(`
    INSERT INTO properties (
      owner_id,
      title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night,
      street,
      city,
      province,
      post_code,
      country,
      parking_spaces,
      number_of_bathrooms,
      number_of_bedrooms
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING *
    `, [...values])
    .then(res => {
      // a new property added to the database will not appear in 
      // the My Listings area of the application because it does not 
      // have a review or an average rating.
      // we can check it's been added in the console.
      // alternatively, we can query the db directly to check it's been added
      console.log(res.rows);
      return res.rows[0];
    })
    .catch(error => {
      console.log(error);
    });
}
exports.addProperty = addProperty;
