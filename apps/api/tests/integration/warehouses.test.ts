import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, insertWarehouse, resetDatabase } from "./testDb";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("warehouses API", () => {
  it("creates and then fetches a warehouse", async () => {
    const createRes = await request(app)
      .post("/api/warehouses")
      .send({
        code: "WH-9",
        name: "Austin Fulfillment Center",
        city: "Austin",
        state: "TX",
        country: "US",
        capacityUnits: 750,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ code: "WH-9", capacityUnits: 750 });

    const getRes = await request(app).get(`/api/warehouses/${createRes.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe("Austin Fulfillment Center");
  });

  it("rejects invalid input with a 400", async () => {
    const res = await request(app).post("/api/warehouses").send({ code: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Request validation failed");
  });

  it("returns 404 for a warehouse that does not exist", async () => {
    const res = await request(app).get("/api/warehouses/999999");
    expect(res.status).toBe(404);
  });

  it("lists warehouses with pagination", async () => {
    await insertWarehouse({ code: "WH-A", name: "Alpha" });
    await insertWarehouse({ code: "WH-B", name: "Beta" });

    const res = await request(app).get("/api/warehouses?page=1&pageSize=1");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(2);
  });

  it("updates and deletes a warehouse", async () => {
    const warehouse = await insertWarehouse({ code: "WH-C", name: "Gamma" });

    const updateRes = await request(app)
      .patch(`/api/warehouses/${warehouse.id}`)
      .send({ name: "Gamma Updated" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe("Gamma Updated");

    const deleteRes = await request(app).delete(`/api/warehouses/${warehouse.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/warehouses/${warehouse.id}`);
    expect(getRes.status).toBe(404);
  });
});
