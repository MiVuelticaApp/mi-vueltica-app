/** Tests build dates with local constructors: run them in Costa Rica time, the zone the app formats in. */
module.exports = () => {
  process.env.TZ = 'America/Costa_Rica';
};
