const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.newProductNotification = onDocumentCreated(
  "products/{productId}",
  async (event) => {
    try {
      const product = event.data.data();
      const productId = event.params.productId;

      console.log("NEW PRODUCT:", product.name);

      const tokensSnapshot = await admin
        .firestore()
        .collection("fcmTokens")
        .get();

      const tokens = tokensSnapshot.docs
        .map(doc => doc.data().token)
        .filter(Boolean);

      if (!tokens.length) {
        console.log("No FCM tokens found");
        return;
      }

      const message = {
        notification: {
          title: "🛍️ New Product Added",
          body: product.name || "New product available",
        },

        data: {
          productId,
          image: product.imageUrl || "",
        },

        webpush: {
          notification: {
            image: product.imageUrl || "",
            icon: "https://shopping1-f3eb3.web.app/logo.png",
          },
          fcmOptions: {
            link: `https://shopping1-f3eb3.web.app/product/${productId}`,
          },
        },

        tokens,
      };

      const response =
        await admin.messaging().sendEachForMulticast(message);

      console.log(
        `Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return response;

    } catch (err) {
      console.error(err);
    }
  }
);

exports.newOrderNotification = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    try {
      const order = event.data.data();
      const orderId = event.params.orderId;

      console.log("NEW ORDER:", orderId);

      // 🔥 نجيب كل اليوزرز
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();

      // 🔥 نطلع التوكن فقط من الأدمن
      const tokens = usersSnapshot.docs
        .map(doc => doc.data().fcmToken) // مهم يكون عندك الحقل هذا
        .filter(Boolean);

      if (!tokens.length) {
        console.log("No admin tokens found");
        return;
      }

      const message = {
        notification: {
          title: "🛒 New Order Received",
          body: `Total: $${order.totalPrice || 0}`,
        },

        data: {
          orderId,
        },

        webpush: {
          notification: {
            icon: "https://shopping1-f3eb3.web.app/logo.png",
          },
          fcmOptions: {
            link: `https://shopping1-f3eb3.web.app/admin/orders/${orderId}`,
          },
        },

        tokens,
      };

      const response =
        await admin.messaging().sendEachForMulticast(message);

      console.log(
        `ADMIN ORDER NOTIF → Success: ${response.successCount}, Failed: ${response.failureCount}`
      );

      return response;

    } catch (err) {
      console.error("ORDER NOTIF ERROR:", err);
    }
  }
);