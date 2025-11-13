const request = require('supertest');
const app = require('../app');
const { sql } = require('../db/sql');

// Mock the sql module
jest.mock('../db/sql', () => ({
  sql: jest.fn(),
  shutdown: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    // Clear mock history before each test
    sql.mockClear();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        first_name: 'John',
        last_name: 'Doe',
        nickname: 'johndoe',
        email: 'john.doe@example.com',
        password: 'password123',
      };

      // Mock the database insertion
      sql.mockResolvedValueOnce([
        {
          id: 1,
          ...newUser,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const response = await request(app)
        .post('/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.nickname).toBe('johndoe');
    });

    it('should return 409 if nickname is already in use', async () => {
      const newUser = {
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'janedoe',
        email: 'jane.doe@example.com',
        password: 'password123',
      };

      // Mock a database error for unique constraint violation
      const dbError = new Error('Duplicate key value violates unique constraint');
      dbError.code = '23505';
      dbError.constraint = 'users_nickname_key';
      sql.mockRejectedValueOnce(dbError);

      const response = await request(app)
        .post('/auth/register')
        .send(newUser);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('NICKNAME_IN_USE');
    });
  });

  describe('POST /auth/login', () => {
    it('should login an existing user successfully', async () => {
      const loginCredentials = {
        nickname: 'testuser',
        password: 'password',
      };

      // Mock the database user lookup
      sql.mockResolvedValueOnce([
        {
          id: 2,
          nickname: 'testuser',
          password_hash: '$2b$10$abcdefghijklmnopqrstuv',
        },
      ]);

      // Mock bcrypt.compare to return true
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginCredentials = {
        nickname: 'wronguser',
        password: 'wrongpassword',
      };

      // Mock the database to find no user
      sql.mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
