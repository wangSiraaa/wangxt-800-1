"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const Role = {
    RECYCLER: 'RECYCLER',
    TOWN_AUDITOR: 'TOWN_AUDITOR',
    FINANCE_REVIEWER: 'FINANCE_REVIEWER',
    SUPERVISOR: 'SUPERVISOR',
};
const BatchStatus = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    TOWN_APPROVED: 'TOWN_APPROVED',
    TOWN_REJECTED: 'TOWN_REJECTED',
    FINANCE_APPROVED: 'FINANCE_APPROVED',
    FINANCE_REJECTED: 'FINANCE_REJECTED',
    SECOND_REVIEW: 'SECOND_REVIEW',
    PAYMENT_APPROVED: 'PAYMENT_APPROVED',
    PAYMENT_REJECTED: 'PAYMENT_REJECTED',
    PAID: 'PAID',
    CORRECTED: 'CORRECTED',
};
const ReviewType = {
    TOWN_AUDIT: 'TOWN_AUDIT',
    FINANCE_REVIEW: 'FINANCE_REVIEW',
    SECOND_REVIEW: 'SECOND_REVIEW',
    CORRECTION: 'CORRECTION',
};
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('开始种子数据...');
    // 清空现有数据
    await prisma.correction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.review.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.farmer.deleteMany();
    await prisma.subsidyRule.deleteMany();
    await prisma.user.deleteMany();
    // 创建用户
    const password = await bcryptjs_1.default.hash('123456', 10);
    const users = await Promise.all([
        prisma.user.create({
            data: {
                username: 'recycler1',
                password,
                name: '张回收',
                role: Role.RECYCLER,
            },
        }),
        prisma.user.create({
            data: {
                username: 'auditor1',
                password,
                name: '李审核',
                role: Role.TOWN_AUDITOR,
            },
        }),
        prisma.user.create({
            data: {
                username: 'finance1',
                password,
                name: '王财政',
                role: Role.FINANCE_REVIEWER,
            },
        }),
        prisma.user.create({
            data: {
                username: 'supervisor1',
                password,
                name: '赵监管',
                role: Role.SUPERVISOR,
            },
        }),
    ]);
    console.log('✅ 创建用户:', users.map(u => u.username));
    // 创建补贴规则
    const subsidyRule = await prisma.subsidyRule.create({
        data: {
            name: '2024年农膜回收补贴标准',
            pricePerKg: 2.5,
            weightThreshold: 200,
            anomalyRatio: 1.5,
            description: '标准补贴: 2.5元/公斤，超过历史均值1.5倍或单批次超200公斤进入二次复核',
        },
    });
    console.log('✅ 创建补贴规则:', subsidyRule.name);
    // 创建农户
    const farmers = await Promise.all([
        prisma.farmer.create({
            data: {
                idCard: '110101199001010001',
                name: '王大爷',
                phone: '13800138001',
                village: '东村村',
                town: '李家镇',
                plotNumber: 'DN-001',
                plotArea: 5.2,
            },
        }),
        prisma.farmer.create({
            data: {
                idCard: '110101199001010002',
                name: '刘大妈',
                phone: '13800138002',
                village: '西村村',
                town: '李家镇',
                plotNumber: 'XN-002',
                plotArea: 3.8,
            },
        }),
        prisma.farmer.create({
            data: {
                idCard: '110101199001010003',
                name: '陈叔',
                phone: '13800138003',
                village: '南村村',
                town: '王家镇',
                plotNumber: 'NN-003',
                plotArea: 6.5,
            },
        }),
    ]);
    console.log('✅ 创建农户:', farmers.map(f => f.name));
    // 创建一些历史批次（用于计算历史均值）
    const historicalBatches = [];
    const dates = [
        new Date('2024-03-15'),
        new Date('2024-04-20'),
        new Date('2024-05-10'),
        new Date('2024-06-05'),
    ];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < dates.length; j++) {
            const batch = await prisma.batch.create({
                data: {
                    batchNo: `BATCH-HIST-${i + 1}-${j + 1}`,
                    farmerId: farmers[i].id,
                    weight: 30 + Math.random() * 40,
                    plotNumber: farmers[i].plotNumber || `PLOT-${i + 1}`,
                    submitterId: users[0].id,
                    status: BatchStatus.PAID,
                    hasPhoto: true,
                    subsidyAmount: (30 + Math.random() * 40) * 2.5,
                    collectionDate: dates[j],
                },
            });
            historicalBatches.push(batch);
            // 添加审核记录
            await prisma.review.create({
                data: {
                    batchId: batch.id,
                    reviewerId: users[1].id,
                    reviewType: ReviewType.TOWN_AUDIT,
                    opinion: '材料齐全，重量相符，审核通过',
                    isPassed: true,
                },
            });
            await prisma.review.create({
                data: {
                    batchId: batch.id,
                    reviewerId: users[2].id,
                    reviewType: ReviewType.FINANCE_REVIEW,
                    opinion: '补贴金额计算正确，复核通过',
                    isPassed: true,
                },
            });
            // 添加发放记录
            await prisma.payment.create({
                data: {
                    batchId: batch.id,
                    amount: batch.subsidyAmount,
                    payerId: users[2].id,
                    payDate: new Date(dates[j].getTime() + 86400000 * 5),
                    payStatus: 'PAID',
                    remark: '正常发放',
                },
            });
        }
    }
    console.log('✅ 创建历史批次:', historicalBatches.length, '条');
    // 创建一个待审核的批次
    const pendingBatch = await prisma.batch.create({
        data: {
            batchNo: 'BATCH-2024-001',
            farmerId: farmers[0].id,
            weight: 45.5,
            plotNumber: 'DN-001',
            submitterId: users[0].id,
            status: BatchStatus.SUBMITTED,
            hasPhoto: true,
            subsidyAmount: 45.5 * 2.5,
            collectionDate: new Date(),
        },
    });
    console.log('✅ 创建待审核批次:', pendingBatch.batchNo);
    // 创建一个有照片的草稿批次
    const draftBatch = await prisma.batch.create({
        data: {
            batchNo: 'BATCH-2024-002',
            farmerId: farmers[1].id,
            weight: 38.2,
            plotNumber: 'XN-002',
            submitterId: users[0].id,
            status: BatchStatus.DRAFT,
            hasPhoto: false,
            subsidyAmount: 38.2 * 2.5,
            collectionDate: new Date(),
        },
    });
    console.log('✅ 创建草稿批次:', draftBatch.batchNo);
    // 创建一个被退回的批次
    const rejectedBatch = await prisma.batch.create({
        data: {
            batchNo: 'BATCH-2024-003',
            farmerId: farmers[2].id,
            weight: 52.0,
            plotNumber: 'NN-003',
            submitterId: users[0].id,
            status: BatchStatus.TOWN_REJECTED,
            hasPhoto: true,
            subsidyAmount: 52.0 * 2.5,
            collectionDate: new Date(Date.now() - 86400000 * 2),
        },
    });
    await prisma.review.create({
        data: {
            batchId: rejectedBatch.id,
            reviewerId: users[1].id,
            reviewType: ReviewType.TOWN_AUDIT,
            opinion: '照片拍摄不清晰，无法确认重量，请重新拍摄上传',
            isPassed: false,
        },
    });
    console.log('✅ 创建被退回批次:', rejectedBatch.batchNo);
    console.log('\n🎉 种子数据完成!');
    console.log('\n测试账号 (密码均为 123456):');
    console.log('  回收站: recycler1 / 123456');
    console.log('  乡镇审核: auditor1 / 123456');
    console.log('  财政复核: finance1 / 123456');
    console.log('  监管人员: supervisor1 / 123456');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map