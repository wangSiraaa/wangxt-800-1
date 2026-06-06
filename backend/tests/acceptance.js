"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || '3001'}/api`;
const results = [];
function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode || 500,
                        data: data ? JSON.parse(data) : {},
                    });
                }
                catch (e) {
                    resolve({ statusCode: res.statusCode || 500, data: { raw: data } });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}
function makeOptions(path, method, token, extraHeaders) {
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const url = new URL(API_BASE + path);
    return {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method,
        headers,
    };
}
async function runTest(name, fn) {
    try {
        await fn();
        results.push({ name, passed: true, message: '✅ 通过' });
        console.log(`✅ ${name}`);
    }
    catch (e) {
        results.push({ name, passed: false, message: e.message });
        console.log(`❌ ${name}: ${e.message}`);
    }
}
async function waitForServer(timeout = 30000) {
    console.log('⏳ 等待服务器启动...');
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const { statusCode } = await request(makeOptions('/health', 'GET'));
            if (statusCode === 200) {
                console.log('✅ 服务器已启动');
                return;
            }
        }
        catch (e) {
            // 服务器尚未就绪
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('服务器启动超时');
}
async function main() {
    console.log('\n========================================');
    console.log('  农膜回收补贴审核系统 - 验收测试');
    console.log('========================================\n');
    try {
        await waitForServer();
    }
    catch (e) {
        console.error('❌ 无法连接到服务器，请确保后端已启动');
        process.exit(1);
    }
    let recyclerToken = '';
    let auditorToken = '';
    let financeToken = '';
    let farmerId = '';
    let testBatchId = '';
    let rejectedBatchId = '';
    await runTest('登录 - 回收站账号', async () => {
        const { statusCode, data } = await request(makeOptions('/auth/login', 'POST'), { username: 'recycler1', password: '123456' });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '登录失败');
        }
        recyclerToken = data.data.token;
        if (!recyclerToken)
            throw new Error('未获取到令牌');
    });
    await runTest('登录 - 乡镇审核员账号', async () => {
        const { statusCode, data } = await request(makeOptions('/auth/login', 'POST'), { username: 'auditor1', password: '123456' });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '登录失败');
        }
        auditorToken = data.data.token;
        if (!auditorToken)
            throw new Error('未获取到令牌');
    });
    await runTest('登录 - 财政复核员账号', async () => {
        const { statusCode, data } = await request(makeOptions('/auth/login', 'POST'), { username: 'finance1', password: '123456' });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '登录失败');
        }
        financeToken = data.data.token;
        if (!financeToken)
            throw new Error('未获取到令牌');
    });
    await runTest('获取农户列表', async () => {
        const { statusCode, data } = await request(makeOptions('/farmers', 'GET', recyclerToken));
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '获取农户列表失败');
        }
        if (!data.data || data.data.length === 0) {
            throw new Error('未找到农户数据');
        }
        farmerId = data.data[0].id;
        console.log(`  选择农户: ${data.data[0].name}`);
    });
    await runTest('场景1: 提交无照片批次 - 应该被拒绝', async () => {
        const { statusCode: createCode, data: createData } = await request(makeOptions('/batches', 'POST', recyclerToken), {
            farmerId,
            weight: 50,
            plotNumber: 'TEST-PLOT-001',
            collectionDate: new Date().toISOString(),
        });
        if (createCode !== 201 || !createData.success) {
            throw new Error(createData.error || '创建批次失败');
        }
        const batchId = createData.data.id;
        const { statusCode: submitCode, data: submitData } = await request(makeOptions('/batches/submit', 'POST', recyclerToken), { batchId });
        if (submitCode !== 400) {
            throw new Error(`期望返回400，实际返回${submitCode}`);
        }
        if (!submitData.error?.includes('照片')) {
            throw new Error('错误信息应包含照片相关提示，实际: ' + submitData.error);
        }
        console.log('  正确拒绝了无照片的批次提交');
    });
    await runTest('场景2: 上传异常重量 - 验证进入二次复核', async () => {
        const { statusCode, data } = await request(makeOptions('/batches', 'POST', recyclerToken), {
            farmerId,
            weight: 500,
            plotNumber: 'TEST-PLOT-002',
            collectionDate: new Date().toISOString(),
        });
        if (statusCode !== 201 || !data.success) {
            throw new Error(data.error || '创建批次失败');
        }
        testBatchId = data.data.id;
        console.log(`  创建批次: ${data.data.batchNo}, 重量: 500kg`);
    });
    await runTest('为异常批次上传模拟照片', async () => {
        const boundary = '----TestBoundary123456789';
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
            Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const options = makeOptions(`/batches/${testBatchId}/photos`, 'POST', recyclerToken, {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
        });
        const { statusCode, data } = await new Promise((resolve, reject) => {
            const req = http_1.default.request(options, (res) => {
                let d = '';
                res.on('data', (c) => (d += c));
                res.on('end', () => {
                    try {
                        resolve({ statusCode: res.statusCode || 500, data: d ? JSON.parse(d) : {} });
                    }
                    catch (e) {
                        resolve({ statusCode: res.statusCode || 500, data: { raw: d } });
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '上传照片失败');
        }
        console.log(`  上传了 ${data.data?.length || 0} 张照片`);
    });
    await runTest('提交异常重量批次 - 验证自动进入二次复核', async () => {
        const { statusCode, data } = await request(makeOptions('/batches/submit', 'POST', recyclerToken), { batchId: testBatchId });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '提交批次失败');
        }
        const batch = data.data.batch;
        if (!batch.isAnomaly) {
            throw new Error('批次应被标记为异常');
        }
        if (batch.status !== 'SECOND_REVIEW') {
            throw new Error(`异常批次状态应为 SECOND_REVIEW，实际为 ${batch.status}`);
        }
        console.log(`  批次状态: ${batch.status}`);
        console.log(`  异常原因: ${data.data.anomalyCheck.reason}`);
    });
    await runTest('验证财政复核员可以看到二次复核批次', async () => {
        const { statusCode, data } = await request(makeOptions('/reviews/pending', 'GET', financeToken));
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '查询待审核失败');
        }
        const hasSecondReview = data.data.some((b) => b.id === testBatchId && b.status === 'SECOND_REVIEW');
        if (!hasSecondReview) {
            throw new Error('财政复核员应能看到二次复核批次');
        }
        console.log(`  待审核列表包含 ${data.data.length} 条记录`);
    });
    await runTest('场景3: 创建一个被退回的批次', async () => {
        const { statusCode, data } = await request(makeOptions('/batches', 'POST', recyclerToken), {
            farmerId,
            weight: 30,
            plotNumber: 'TEST-PLOT-003',
            collectionDate: new Date(Date.now() - 86400000).toISOString(),
        });
        if (statusCode !== 201 || !data.success) {
            throw new Error(data.error || '创建批次失败');
        }
        rejectedBatchId = data.data.id;
        console.log(`  创建批次: ${data.data.batchNo}`);
    });
    await runTest('为退回批次上传照片', async () => {
        const boundary = '----TestBoundary987654321';
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="test2.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
            Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const options = makeOptions(`/batches/${rejectedBatchId}/photos`, 'POST', recyclerToken, {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
        });
        const { statusCode, data } = await new Promise((resolve, reject) => {
            const req = http_1.default.request(options, (res) => {
                let d = '';
                res.on('data', (c) => (d += c));
                res.on('end', () => {
                    try {
                        resolve({ statusCode: res.statusCode || 500, data: d ? JSON.parse(d) : {} });
                    }
                    catch (e) {
                        resolve({ statusCode: res.statusCode || 500, data: { raw: d } });
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '上传照片失败');
        }
    });
    await runTest('提交退回测试批次', async () => {
        const { statusCode, data } = await request(makeOptions('/batches/submit', 'POST', recyclerToken), { batchId: rejectedBatchId });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '提交批次失败');
        }
        console.log(`  批次提交成功，状态: ${data.data.batch.status}`);
    });
    await runTest('乡镇审核员审核通过', async () => {
        const { statusCode, data } = await request(makeOptions('/reviews/review', 'POST', auditorToken), {
            batchId: rejectedBatchId,
            opinion: '测试审核通过',
            isPassed: true,
            reviewType: 'TOWN_AUDIT',
        });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '审核失败');
        }
        console.log(`  乡镇审核后状态: ${data.data.batch.status}`);
    });
    await runTest('财政复核 - 退回批次', async () => {
        const { statusCode, data } = await request(makeOptions('/reviews/review', 'POST', financeToken), {
            batchId: rejectedBatchId,
            opinion: '测试：补贴信息有误，予以退回',
            isPassed: false,
            reviewType: 'FINANCE_REVIEW',
        });
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '复核失败');
        }
        console.log(`  财政复核后状态: ${data.data.batch.status}`);
    });
    await runTest('场景4: 尝试给退回记录发放补贴 - 应该被拒绝', async () => {
        const { statusCode, data } = await request(makeOptions('/payments/pay', 'POST', financeToken), { batchId: rejectedBatchId, remark: '测试发放' });
        if (statusCode !== 400) {
            throw new Error(`期望返回400，实际返回${statusCode}`);
        }
        if (!data.error?.includes('退回') && !data.error?.includes('不得发放')) {
            throw new Error('错误信息应提示退回后不得发放，实际: ' + data.error);
        }
        console.log('  ✅ 正确拒绝了退回记录的补贴发放');
        console.log(`  拒绝原因: ${data.error}`);
    });
    await runTest('验证监管看板数据', async () => {
        const { statusCode, data } = await request(makeOptions('/supervisor/dashboard', 'GET', financeToken));
        if (statusCode !== 200 || !data.success) {
            throw new Error(data.error || '获取看板数据失败');
        }
        console.log(`  总批次: ${data.data.overview.totalBatches}`);
        console.log(`  异常批次: ${data.data.overview.anomalyCount}`);
        console.log(`  已发放: ${data.data.overview.paidCount}`);
    });
    console.log('\n========================================');
    console.log('  测试结果汇总');
    console.log('========================================');
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.passed ? '✅' : '❌'} ${r.name}`);
        if (!r.passed) {
            console.log(`   错误: ${r.message}`);
        }
    });
    console.log(`\n总计: ${results.length} 项测试`);
    console.log(`通过: ${passed} 项`);
    console.log(`失败: ${failed} 项`);
    if (failed > 0) {
        console.log('\n❌ 验收未通过');
        process.exit(1);
    }
    else {
        console.log('\n🎉 全部测试通过！验收成功！');
        process.exit(0);
    }
}
main().catch((e) => {
    console.error('测试执行错误:', e);
    process.exit(1);
});
//# sourceMappingURL=acceptance.js.map
