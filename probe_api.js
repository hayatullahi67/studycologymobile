// Native fetch is available in Node 24

const API_URL = 'https://api.myquest.com.ng/api/questions';
const API_KEY = 'd28b92ddb3380305b79d636e2e4fd44e366b97b189a757221795a97fe73ae1c8';

async function probe() {
    try {
        console.log('Fetching exams...');
        const examRes = await fetch(`${API_URL}?get=exam`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const exams = await examRes.json();
        console.log('Exams:', JSON.stringify(exams, null, 2));

        if (exams.success && exams.data.length > 0) {
            const examName = exams.data[0];
            console.log(`\nFetching years for ${examName}...`);
            const yearRes = await fetch(`${API_URL}?get=exam_year_id`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ exam: examName })
            });
            const years = await yearRes.json();
            console.log('Years:', JSON.stringify(years, null, 2));

            if (years.success && years.data.length > 0) {
                const yearId = years.data[0];
                console.log(`\nFetching subjects for ${examName} year ${yearId}...`);
                const subRes = await fetch(`${API_URL}?get=subject`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ exam: examName, exam_year_id: yearId })
                });
                const subjects = await subRes.json();
                console.log('Subjects:', JSON.stringify(subjects, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    }
}

probe();
