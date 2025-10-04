import { seedAqStations } from "./aq-stations";

const main = async () => {
    await seedAqStations();
}

main().then(() => {
    console.log("success")
    process.exit(0);
}).catch((e) => {
    console.log(e)
    process.exit(1);
})