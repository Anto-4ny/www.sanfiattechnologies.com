export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { Body } = req.body;
        // Your callback logic here
        res.status(200).send('Callback processed successfully');
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
