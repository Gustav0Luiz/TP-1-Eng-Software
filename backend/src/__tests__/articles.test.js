const request = require('supertest');
const app = require('../app');
const { sql } = require('../db/sql');
const { sendMail } = require('../lib/mailer');

// Mock dependencies
jest.mock('../db/sql', () => ({
  sql: jest.fn(),
  shutdown: jest.fn(),
}));

jest.mock('../lib/mailer', () => ({
  sendMail: jest.fn(),
}));

// Mock the auth middleware to simulate an authenticated user
jest.mock('../middlewares/auth', () => ({
  auth: (req, res, next) => {
    req.user = { id: 1, nickname: 'testuser', email: 'test@user.com' };
    next();
  },
}));

describe('Articles API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    sql.mockClear();
    sendMail.mockClear();
  });

  describe('POST /articles', () => {
    it('should create a new article successfully', async () => {
      // Mock database responses
      sql
        // upsertEditionByEventNameAndYearForUser
        .mockResolvedValueOnce([{ id: 10, event_id: 1, year: 2024 }])
        // checkDuplicateArticle
        .mockResolvedValueOnce([])
        // insertArticle -> main insert
        .mockResolvedValueOnce([{ id: 101, title: 'New Article' }])
        // insertArticle -> get edition data for notification
        .mockResolvedValueOnce([{ event_name: 'Test Event', year: 2024 }]);

      const response = await request(app)
        .post('/articles')
        .field('title', 'New Article')
        .field('eventName', 'Test Event')
        .field('year', '2024')
        .field('authors', '["Author One", "Author Two"]')
        .attach('pdf', Buffer.from('dummy pdf content'), 'article.pdf');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 101);

      // Check if the notification function was called
      expect(sendMail).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/articles')
        .field('title', 'Incomplete Article');
        // Missing eventName, year, and pdf

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION');
    });
  });

  describe('DELETE /articles/:id', () => {
    it('should delete an article successfully', async () => {
      const articleId = 1;

      // Mock DB calls: check existence, delete from join table, delete from articles
      sql
        .mockResolvedValueOnce([{ id: articleId }]) // Exists check
        .mockResolvedValueOnce([]) // Delete from article_authors
        .mockResolvedValueOnce([]); // Delete from articles

      const response = await request(app).delete(`/articles/${articleId}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('should return 404 if article does not exist', async () => {
      const articleId = 999;
      sql.mockResolvedValueOnce([]); // Mock article not found

      const response = await request(app).delete(`/articles/${articleId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /articles/:id', () => {
    it('should update an article successfully', async () => {
      const articleId = 1;

      // Mock DB calls: ownership check, update query
      sql
        .mockResolvedValueOnce([{ id: articleId }]) // Ownership check
        .mockResolvedValueOnce([{ id: articleId }]); // Update returns the id

      const response = await request(app)
        .put(`/articles/${articleId}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('should return 404 if user does not own the article', async () => {
      const articleId = 1;
      sql.mockResolvedValueOnce([]); // Mock ownership check failure

      const response = await request(app)
        .put(`/articles/${articleId}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
