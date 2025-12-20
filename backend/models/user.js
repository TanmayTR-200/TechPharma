const bcrypt = require('bcryptjs');

// Mock database
let users = [
  {
    _id: '1',
    name: 'Tanmay T',
    email: 'tanmaytalanki.cs23@bmsce.ac.in',
    password: '$2a$10$1234567890123456789012',
    company: {
      name: 'ascompany',
      description: '',
      website: '',
      address: '',
      logo: ''
    },
    phone: '',
    resetOtp: null,
    createdAt: new Date('2025-10-13')
  }
];

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async findOne(query) {
    return users.find(user => 
      Object.entries(query).every(([key, value]) => {
        if (key === 'email') {
          return user[key]?.toLowerCase() === value?.toLowerCase();
        }
        return user[key] === value;
      })
    );
  }

  async save() {
    if (!this._id) {
      // New user
      if (!this.password) {
        throw new Error('Password is required');
      }
      // Hash password for new users only
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this._id = Date.now().toString();
      // Initialize company object for new users
      if (!this.company) {
        this.company = {
          name: '',
          description: '',
          website: '',
          address: '',
          logo: ''
        };
      }
      users.push(this);
    } else {
      // Update existing user
      const index = users.findIndex(u => u._id === this._id);
      if (index !== -1) {
        // Don't rehash the password if it's already hashed
        if (this.password && !this.password.startsWith('$2a$')) {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
        }
        // Ensure company object exists and handle company update properly
        const updatedUser = {
          ...users[index],
          ...this,
          company: {
            ...users[index].company,
            ...(this.company || {}),
          }
        };

        // Update the user in the array
        users[index] = updatedUser;

        // Save to JSON file
        try {
          const fs = require('fs');
          const path = require('path');
          const usersFilePath = path.join(__dirname, '../data/users.json');
          fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        } catch (error) {
          console.error('Error saving users to file:', error);
          throw error;
        }
      }
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

module.exports = User;