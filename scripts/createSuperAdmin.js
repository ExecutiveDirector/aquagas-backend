const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const passwordHash = await bcrypt.hash('SuperSecurePassword123!', 10);

    // First, create the auth_account
    const [accountId] = await queryInterface.bulkInsert(
      'auth_accounts',
      [
        {
          email: 'superadmin@example.com',
          password_hash: passwordHash,
          role: 'admin',
          email_verified: 1,
          phone_verified: 1,
          is_active: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { returning: ['account_id'] }
    );

    // Then, create the admin_user linked to it
    await queryInterface.bulkInsert('admin_users', [
      {
        account_id: accountId,
        admin_role: 'super_admin',
        permissions: JSON.stringify({ full_access: true }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('admin_users', null, {});
    await queryInterface.bulkDelete('auth_accounts', null, {});
  },
};
