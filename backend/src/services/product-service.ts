import { HttpError } from "../server/errors.js";
import { getFirestoreAdmin } from "./firebase-admin.js";
import { Query } from "firebase-admin/firestore";

const PRODUCTS_COLLECTION = "products";

export class ProductService {
  private db() {
    return getFirestoreAdmin();
  }

  async listProducts(publishedOnly = true) {
    let query: Query = this.db().collection(PRODUCTS_COLLECTION);

    if (publishedOnly) {
      query = query.where("published", "==", true);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getProduct(productId: string) {
    const doc = await this.db().collection(PRODUCTS_COLLECTION).doc(productId).get();

    if (!doc.exists) {
      throw new HttpError(404, "Product not found");
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async createProduct(
    title: string,
    description: string,
    type: "ebook" | "prompt",
    price: number,
    currency: string,
    authorId: string,
    tags: string[] = [],
  ) {
    const docRef = await this.db().collection(PRODUCTS_COLLECTION).add({
      title,
      description,
      type,
      price,
      currency,
      author_id: authorId,
      published: false,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async updateProduct(
    productId: string,
    updates: Partial<{
      title: string;
      description: string;
      price: number;
      published: boolean;
      tags: string[];
    }>,
  ) {
    const docRef = this.db().collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpError(404, "Product not found");
    }

    await docRef.update({
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const updated = await docRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  }

  async deleteProduct(productId: string) {
    const docRef = this.db().collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpError(404, "Product not found");
    }

    await docRef.delete();
  }
}
