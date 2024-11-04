const express = require("express");
const app = express();
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();
// Connect string
const api = process.env.API_URL;
const atlas = process.env.CONNECTION_STRING;

//cloud
const cloudName = process.env.CloudName;
const apikey = process.env.Apikey;
const apisecret = process.env.Apisecret;

const morgan = require("morgan");
const mongoose = require("mongoose");
const productRouter = require("./routers/products");
const userRouter = require("./routers/user");
const categoryRouter = require("./routers/category");
const orderRouter = require("./routers/order");
// const cartRouter = require("./routers/cart");
const restaurantRouter = require("./routers/restaurant");
const orderItemRouter = require("./routers/order-item");
const favoriteRouter = require("./routers/favorite");
const attributeRouter = require("./routers/attribute");
const clientRouter = require("./routers/clientRouter");

//

const authJwt = require("./helper/jwt");
const errorHandler = require("./helper/error-handler");
require("dotenv").config();
// Middleware
app.use(cors());
app.options("*", cors());
app.use(express.json());

app.use(morgan("tiny"));
app.use(authJwt());
app.use(errorHandler);
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));
//Cloud image
cloudinary.config({
  cloud_name: cloudName, // Replace with your Cloud Name
  api_key: apikey, // Replace with your API Key
  api_secret: apisecret, // Replace with your API Secret
});
//Router
app.use(`${api}/products`, productRouter);
app.use(`${api}/users`, userRouter);
app.use(`${api}/category`, categoryRouter);
app.use(`${api}/orders`, orderRouter);
app.use(`${api}/restaurants`, restaurantRouter);
// app.use(`${api}/types`, typeRouter);
// app.use(`${api}/ingrediants`, ingrediantRouter);
app.use(`${api}/orderitem`, orderItemRouter);
app.use(`${api}/favorites`, favoriteRouter);
app.use(`${api}/attributes`, attributeRouter);
// app.use(`${api}/carts`, cartRouter);
app.use(`${api}/client`, clientRouter);
mongoose
  .connect(atlas, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "GGShop-DATN",
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas", err);
  });

app.listen(3000, () => {
  console.log(api);
  console.log("Server is running on port http://localhost:3000");
});
