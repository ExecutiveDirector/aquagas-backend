const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const password = 'SuperSecurePassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('New password hash:', hashedPassword);
  } catch (err) {
    console.error('Error generating password hash:', err);
  }
}

resetPassword();