const request = require('supertest');
const app = require('../server');

describe("Orders API", () => {
  it("should create a new order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ user_id: 1, total_price: 500 });
    expect(res.statusCode).toEqual(201);
  });
});
