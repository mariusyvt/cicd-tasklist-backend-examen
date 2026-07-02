import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
  default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
  beforeEach(async () => {
    // Clean up database between tests
    await testPrisma.task.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("POST /api/tasks", () => {
    it("should create a new task with title and description", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "E2E Task", description: "E2E Description" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.title).toBe("E2E Task");
      expect(res.body.description).toBe("E2E Description");
      expect(res.body.completed).toBe(false);
    });

    it("should create a new task with only title", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "Task without description" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Task without description");
      expect(res.body.description).toBeNull();
    });

    it("should return 400 when title is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ description: "Only description" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Title is required and must be a non-empty string",
      );
    });

    it("should return 400 when title is empty", async () => {
      const res = await request(app).post("/api/tasks").send({ title: "   " });

      expect(res.status).toBe(400);
    });

    it("should return 400 when title is not a string", async () => {
      const res = await request(app).post("/api/tasks").send({ title: 123 });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/tasks", () => {
    it("should return empty array when no tasks exist", async () => {
      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return all tasks", async () => {
      // Create test tasks
      await testPrisma.task.create({ data: { title: "Task 1" } });
      await testPrisma.task.create({ data: { title: "Task 2" } });

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("should return tasks ordered by createdAt desc", async () => {
      await testPrisma.task.create({ data: { title: "First Task" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await testPrisma.task.create({ data: { title: "Second Task" } });

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body[0].title).toBe("Second Task");
      expect(res.body[1].title).toBe("First Task");
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should return a task by id", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Test Task", description: "Test Description" },
      });

      const res = await request(app).get(`/api/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe("Test Task");
    });

    it("should return 404 when task does not exist", async () => {
      const res = await request(app).get("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("should return 400 for invalid id format", async () => {
      const res = await request(app).get("/api/tasks/invalid");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update task title", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Original" },
      });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });

    it("should update task description", async () => {
      const task = await testPrisma.task.create({
        data: { title: "Task", description: "Original" },
      });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ description: "Updated Description" });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Updated Description");
    });

    it("should update task completed status", async () => {
      const task = await testPrisma.task.create({ data: { title: "Task" } });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });

    it("should return 404 when task does not exist", async () => {
      const res = await request(app)
        .put("/api/tasks/99999")
        .send({ title: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("should return 400 for invalid id format", async () => {
      const res = await request(app)
        .put("/api/tasks/invalid")
        .send({ title: "Updated" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      const task = await testPrisma.task.create({
        data: { title: "To Delete" },
      });

      const res = await request(app).delete(`/api/tasks/${task.id}`);

      expect(res.status).toBe(204);

      // Verify task is deleted
      const deletedTask = await testPrisma.task.findUnique({
        where: { id: task.id },
      });
      expect(deletedTask).toBeNull();
    });

    it("should return 404 when task does not exist", async () => {
      const res = await request(app).delete("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("should return 400 for invalid id format", async () => {
      const res = await request(app).delete("/api/tasks/invalid");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });
  });
});
