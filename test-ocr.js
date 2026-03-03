import Tesseract from 'tesseract.js';
Tesseract.recognize('mock_plate.png', 'spa')
  .then(({ data: { text } }) => {
    console.log("RAW TEXT:", JSON.stringify(text));
  })
  .catch(console.error);
