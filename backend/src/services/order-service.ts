import { HttpError } from "../server/errors.js";
import { getFirestoreAdmin } from "./firebase-admin.js";

const ORDERS_COLLECTION = "orders";

export class OrderService {
  private db() {
    return getFirestoreAdmin();
  }

  async listOrders(userId: string) {
    const snapshot = await this.db()
      .collection(ORDERS_COLLECTION)
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getOrder(orderId: string, userId: string) {
    const doc = await this.db().collection(ORDERS_COLLECTION).doc(orderId).get();

    if (!doc.exists) {
      throw new HttpError(404, "Order not found");
    }

    const order = { id: doc.id, ...doc.data() } as any;

    // Verify ownership
    if (order.user_id !== userId) {
      throw new HttpError(403, "Access denied");
    }

    return order;
  }

  async createOrder(
    userId: string,
    productId: string,
    productTitle: string,
    amount: number,
    currency: string,
  ) {
    const docRef = await this.db().collection(ORDERS_COLLECTION).add({
      user_id: userId,
      product_id: productId,
      product_title: productTitle,
      amount,
      currency,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: "pending" | "completed" | "failed" | "refunded",
    paymentIntentId?: string,
  ) {
    const docRef = this.db().collection(ORDERS_COLLECTION).doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpError(404, "Order not found");
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentIntentId) {
      updateData.payment_intent_id = paymentIntentId;
    }

    await docRef.update(updateData);

    const updated = await docRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  }
}
