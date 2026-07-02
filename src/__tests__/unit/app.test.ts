import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock le service avant d'importer l'app
vi.mock("../../services/task.service.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import app from "../../app.js";
import * as taskService from "../../services/task.service.js";

const mockService = vi.mocked(taskService);

const mockTask = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  completed: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("App Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Express App Configuration", () => {
    it("should have CORS enabled", async () => {
      mockService.findAll.mockResolvedValue([]);
      const response = await request(app).get("/api/tasks");
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });

    it("should parse JSON body", async () => {
      mockService.create.mockResolvedValue(mockTask);
      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "Test Task", description: "Test description" })
        .set("Content-Type", "application/json");

      expect(response.status).toBe(201);
    });
  });

  describe("Routes - GET /api/tasks", () => {
    it("should return all tasks", async () => {
      const tasks = [mockTask];
      mockService.findAll.mockResolvedValue(tasks);

      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe("Routes - GET /api/tasks/:id", () => {
    it("should return a task by id", async () => {
      mockService.findById.mockResolvedValue(mockTask);

      const response = await request(app).get("/api/tasks/1");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
    });

    it("should return 404 for non-existent task", async () => {
      mockService.findById.mockResolvedValue(null);

      const response = await request(app).get("/api/tasks/999");

      expect(response.status).toBe(404);
    });
  });

  describe("Routes - POST /api/tasks", () => {
    it("should create a new task", async () => {
      mockService.create.mockResolvedValue(mockTask);

      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "New Task", description: "Description" });

      expect(response.status).toBe(201);
    });

    it("should return 400 when title is missing", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({ description: "Only description" });

      expect(response.status).toBe(400);
    });
  });

  describe("Routes - PUT /api/tasks/:id", () => {
    it("should update a task", async () => {
      const updatedTask = { ...mockTask, title: "Updated" };
      mockService.update.mockResolvedValue(updatedTask);

      const response = await request(app)
        .put("/api/tasks/1")
        .send({ title: "Updated" });

      expect(response.status).toBe(200);
    });

    it("should return 404 for non-existent task", async () => {
      mockService.update.mockRejectedValue(new Error("Task not found"));

      const response = await request(app)
        .put("/api/tasks/999")
        .send({ title: "Updated" });

      expect(response.status).toBe(404);
    });
  });

  describe("Routes - DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      mockService.remove.mockResolvedValue(mockTask);

      const response = await request(app).delete("/api/tasks/1");

      expect(response.status).toBe(204);
    });

    it("should return 404 for non-existent task", async () => {
      mockService.remove.mockRejectedValue(new Error("Task not found"));

      const response = await request(app).delete("/api/tasks/999");

      expect(response.status).toBe(404);
    });
  });
});
