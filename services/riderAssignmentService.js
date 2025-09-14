const sequelize = require('../config/db');

exports.autoAssignRider = async (orderId) => {
  await sequelize.query('CALL sp_auto_assign_rider(:orderId)', {
    replacements: { orderId }
  });
  return true;
};
