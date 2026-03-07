const mongoose = require('mongoose');

const DailyWordSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    data: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now }
});
const DailyWord = mongoose.models.DailyWord || mongoose.model('DailyWord', DailyWordSchema);

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/chinostandard', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("Deleting all recent _v2_ entries...");

        const result = await DailyWord.deleteMany({ date: { $regex: '2026-03-07' } });
        console.log('Deleted bad cache entry result:', result);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
