import type { FastifyInstance } from "fastify";
import { requireAuth } from "../security/auth.js";
import { ProductService } from "../services/product-service.js";
import { buildProductDto } from "../services/dto.js";

export async function productsRoutes(app: FastifyInstance) {
  const productService = new ProductService();

  // Public: List published products
  app.get(
    "/products",
    async () => {
      const products = await productService.listProducts(true);
      return { products: products.map(buildProductDto) };
    },
  );

  // Public: Get a specific product
  app.get(
    "/products/:id",
    async (req) => {
      const { id } = (req.params as any) as { id: string };
      const product = await productService.getProduct(id);
      return { product: buildProductDto(product) };
    },
  );

  // Admin: Create product
  app.post(
    "/admin/products",
    {
      preHandler: requireAuth as any,
    },
    async (req) => {
      const { title, description, type, price, currency, authorId, tags } = req.body as any;
      
      // TODO: Add admin role check
      const created = await productService.createProduct(
        title,
        description,
        type,
        price,
        currency,
        authorId,
        tags
      );
      return { product: buildProductDto(created) };
    },
  );

  // Admin: Update product
  app.patch(
    "/admin/products/:id",
    {
      preHandler: requireAuth as any,
    },
    async (req) => {
      const { id } = (req.params as any) as { id: string };
      const updates = req.body as any;
      
      // TODO: Add admin role check
      const updated = await productService.updateProduct(id, updates);
      return { product: buildProductDto(updated) };
    },
  );

  // Admin: Delete product
  app.delete(
    "/admin/products/:id",
    {
      preHandler: requireAuth as any,
    },
    async (req) => {
      const { id } = (req.params as any) as { id: string };
      
      // TODO: Add admin role check
      await productService.deleteProduct(id);
      return { ok: true };
    },
  );
}