import cors from "@fastify/cors";
import { buildFastify } from "./app.ts";

const app = buildFastify();

const port = process.env.PORT || "8000";

app.register(cors);

app.listen({ port: parseInt(port) }).then(() => {
  console.log(`Server running at http://localhost:${port}/`);
});
