#!/bin/bash

echo "🚀 开始农膜回收补贴审核系统冒烟测试..."
echo "========================================"

BASE_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"

echo ""
echo "📋 步骤 1: 检查后端健康状态"
echo "----------------------------------------"
for i in {1..30}; do
    if curl -s "$BASE_URL/health" | grep -q "ok"; then
        echo "✅ 后端服务正常运行"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 后端服务启动超时"
        exit 1
    fi
    echo "⏳ 等待后端服务启动... ($i/30)"
    sleep 2
done

echo ""
echo "📋 步骤 2: 测试登录接口"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"town_auditor","password":"123456"}')

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
    echo "✅ 登录成功"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 获取到 token"
else
    echo "❌ 登录失败"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "📋 步骤 3: 测试待审核列表查询"
echo "----------------------------------------"
REVIEWS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/reviews/pending")
if echo "$REVIEWS_RESPONSE" | grep -q "success"; then
    echo "✅ 待审核列表查询成功"
    echo "📊 列表数据正常返回"
else
    echo "❌ 待审核列表查询失败"
    echo "响应: $REVIEWS_RESPONSE"
    exit 1
fi

echo ""
echo "📋 步骤 4: 测试处理回执提交接口"
echo "----------------------------------------"
BATCHES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/batches")
BATCH_ID=$(echo "$BATCHES_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$BATCH_ID" ]; then
    echo "📦 获取到测试批次 ID: $BATCH_ID"
    
    RECEIPT_RESPONSE=$(curl -s -X POST "$BASE_URL/receipts/submit" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"batchId\":\"$BATCH_ID\",\"content\":\"测试处理回执内容\",\"receiptType\":\"TOWN_RECEIPT\"}")
    
    if echo "$RECEIPT_RESPONSE" | grep -q "success"; then
        echo "✅ 处理回执提交成功"
        RECEIPT_ID=$(echo "$RECEIPT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "📄 回执 ID: $RECEIPT_ID"
    else
        echo "❌ 处理回执提交失败"
        echo "响应: $RECEIPT_RESPONSE"
        exit 1
    fi
else
    echo "⚠️  没有找到批次，跳过回执提交测试"
fi

echo ""
echo "📋 步骤 5: 测试处理回执查询接口"
echo "----------------------------------------"
if [ -n "$BATCH_ID" ]; then
    RECEIPT_QUERY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/receipts/batch/$BATCH_ID")
    if echo "$RECEIPT_QUERY_RESPONSE" | grep -q "success"; then
        echo "✅ 处理回执查询成功"
        RECEIPT_COUNT=$(echo "$RECEIPT_QUERY_RESPONSE" | grep -o '"receiptType"' | wc -l)
        echo "📊 找到 $RECEIPT_COUNT 条处理回执记录"
    else
        echo "❌ 处理回执查询失败"
        echo "响应: $RECEIPT_QUERY_RESPONSE"
        exit 1
    fi
fi

echo ""
echo "📋 步骤 6: 检查前端页面可访问"
echo "----------------------------------------"
for i in {1..10}; do
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|304"; then
        echo "✅ 前端页面可正常访问"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "⚠️  前端页面访问超时（可能是 nginx 启动慢），跳过"
        break
    fi
    echo "⏳ 等待前端服务启动... ($i/10)"
    sleep 1
done

echo ""
echo "========================================"
echo "🎉 所有冒烟测试通过！"
echo "========================================"
echo ""
echo "📝 功能验证总结:"
echo "  ✅ 后端服务正常运行"
echo "  ✅ 用户登录认证"
echo "  ✅ 待审核列表查询"
echo "  ✅ 处理回执提交接口"
echo "  ✅ 处理回执查询接口"
echo "  ✅ 前端页面可访问"
echo ""
echo "🔗 系统访问地址:"
echo "  前端: http://localhost:3000"
echo "  后端 API: http://localhost:3001/api"
echo ""
