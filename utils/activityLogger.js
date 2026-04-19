const Activity = require('../models/Activity');

const logActivity = async ({ adminId, action, targetType, targetName, details = '' }) => {
  try {
    await Activity.create({
      admin: adminId,
      action,
      targetType,
      targetName,
      details,
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

module.exports = logActivity;
