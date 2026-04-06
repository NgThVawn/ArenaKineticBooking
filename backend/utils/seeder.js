require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
var mongoose = require('mongoose');

var roleModel = require('../schemas/roles');
var userModel = require('../schemas/users');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sport_booking');
  console.log('Connected to MongoDB');

  // Seed Roles
  var roles = [
    { name: 'USER', description: 'Người dùng thông thường' },
    { name: 'OWNER', description: 'Chủ cơ sở thể thao' },
    { name: 'ADMIN', description: 'Quản trị viên' },
    { name: 'SUPER_ADMIN', description: 'Quản trị viên cấp cao' }
  ];

  for (var roleData of roles) {
    var existing = await roleModel.findOne({ name: roleData.name });
    if (!existing) {
      await roleModel.create(roleData);
      console.log('Created role:', roleData.name);
    } else {
      console.log('Role already exists:', roleData.name);
    }
  }

  // Seed SUPER_ADMIN user
  var superAdminEmail = 'admin@sportbooking.vn';
  var existingAdmin = await userModel.findOne({ email: superAdminEmail });

  if (!existingAdmin) {
    var superAdminRole = await roleModel.findOne({ name: 'SUPER_ADMIN' });
    var adminRole = await roleModel.findOne({ name: 'ADMIN' });

    var adminUser = new userModel({
      fullName: 'Super Admin',
      email: superAdminEmail,
      password: 'Admin@123',
      phone: '0900000000',
      roles: [superAdminRole._id, adminRole._id],
      provider: 'LOCAL',
      isActive: true,
      emailVerified: true
    });

    await adminUser.save();
    console.log('Created SUPER_ADMIN:', superAdminEmail, '/ password: Admin@123');
  } else {
    console.log('SUPER_ADMIN already exists:', superAdminEmail);
  }

  console.log('\nSeeding completed!');
  await mongoose.connection.close();
}

seed().catch(function (err) {
  console.error('Seeding failed:', err);
  process.exit(1);
});