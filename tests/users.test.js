const request = require('supertest');
const app = require('../server'); // make sure server.js exports app

describe("Users API", () => {
  it("should return 200 on GET /api/users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toEqual(200);
  });
});
