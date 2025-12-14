const fetch = require('node-fetch');

async function testAI() {
    const url = 'https://vibecodingapi.ai/v1/chat/completions';
    const apiKey = 'sk-fMlFOuRrOhfzK2pooDnvwJ1XZIaMFsCW730vAgU7DUUI4cAJ';

    console.log('Testing AI connection...');
    console.log('URL:', url);
    console.log('Key:', apiKey.substring(0, 10) + '...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'user', content: 'Say "Hello Content Factory" if you can hear me.' }
                ]
            })
        });

        if (!response.ok) {
            console.error('Network Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response Body:', text);
            return;
        }

        const data = await response.json();
        console.log('--- SUCCESS ---');
        console.log('AI Response:', data.choices[0].message.content);

    } catch (error) {
        console.error('Connection Failed:', error);
    }
}

testAI();
