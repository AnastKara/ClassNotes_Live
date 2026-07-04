import type { FastifyInstance } from "fastify";
import { requireAuth } from "../security/auth.js";
import { OrderService } from "../services/order-service.js";
import { buildOrderDto } from "../services/dto.js";

type AuthedReq = { user?: { userId: string } } & any;

export async function ordersRoutes(app: FastifyInstance) {
  const orderService = new OrderService();

  // List user's orders
  app.get(
    "/orders",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const orders = await orderService.listOrders(req.user!.userId);
      return { orders: orders.map(buildOrderDto) };
    },
  );

  // Get specific order
  app.get(
    "/orders/:id",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const { id } = (req.params as any) as { id: string };
      const order = await orderService.getOrder(id, req.user!.userId);
      return { order: buildOrderDto(order) };
    },
  );

  // Create order (for payment processing)
  app.post(
    "/orders",
    {
      preHandler: requireAuth as any,
    },
    async (req: AuthedReq) => {
      const { productId, productTitle, amount, currency } = req.body as any;
      const created = await orderService.createOrder(
        req.user!.userId,
        productId,
        productTitle,
        amount,
        currency
      );
      return { order: buildOrderDto(created) };
    },
  );
}