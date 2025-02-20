import express from "express";
import { Client } from "pg";
import { HDNodeVoidWallet, HDNodeWallet, Wallet } from "ethers6";
import { mnemonicToSeedSync } from "bip39";
import { MNEUMONICS } from "./config";

const client = new Client(
  "postgresql://neondb_owner:*********@ep-young-heart-a87gqpay-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
);
client.connect();

const seed = mnemonicToSeedSync(MNEUMONICS);

const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const result = await client.query(
    "INSERT INTO users (username, password, depositAddress, privateKey, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [username, password, "", "", 0]
  );

  console.log(result);
  
  const userId = result.rows[0].id;

  const hdNode = HDNodeWallet.fromSeed(seed);
  const child = hdNode.derivePath(`m/44'/60'/${userId}'/0`);

  await client.query(
    "UPDATE users SET depositAddress = $1, privateKey = $2 WHERE id = $3",
    [child.address, child.privateKey, userId])

  console.log(child.privateKey);
  console.log(child.address);

  res.json({
    userId,
  });
});

app.get("/getDepositeAddress/:userId", (req, res) => {
  const userId = req.params.userId;
  
  client.query(
    "SELECT depositAddress FROM users WHERE id = $1",
    [userId]
  )
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const depositAddress = result.rows[0].depositAddress;
      console.log(depositAddress);
      
      res.json({
        userId,
        depositAddress
      });
    })
    .catch(error => {
      console.error("Error fetching deposit address:", error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.listen(3000);
