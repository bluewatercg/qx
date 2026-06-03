# Linux + llama.cpp CUDA 多模态局域网模型服务安装手册（Step One by One）

> 适用场景：在 Linux 服务器上用 llama.cpp / llama-server CUDA 版部署 Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf + mmproj，提供局域网 OpenAI-compatible API，供 Hermes / OpenWebUI / Continue 等客户端使用。

---

## 0. 最终架构

```text
Linux 服务器
  ↓
llama.cpp / llama-server CUDA 版
  ↓
Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
  +
mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf
  ↓
OpenAI-compatible API
  ↓
http://服务器IP:8080/v1
  ↓
Hermes / OpenWebUI / Continue / 其他客户端
```

实际路径：

```bash
/data1/apps/llama.cpp
/data1/apps/llama.cpp/build/bin/llama-server
/data1/apps/start_qwen36_llama_server.sh
/data1/ollama/models/qwen36-35b-a3b-uncensored
http://192.168.1.30:8080/v1
```

---

## 1. 检查服务器环境

```bash
lscpu | egrep 'Model name|CPU\(s\)|Core|Thread|NUMA'
free -h
nvidia-smi
nvidia-smi -L
nvidia-smi topo -m
nvidia-smi nvlink --status 2>/dev/null || true
```

本次实际环境：

```text
CPU: Intel Xeon E5-2690 v4 × 2
线程: 56
内存: 251Gi
GPU: Tesla V100-SXM2-32GB × 2
NVLink: GPU0 <-> GPU1 NV6
Driver: 550.163.01
CUDA Runtime: 12.4
CUDA Toolkit: /usr/local/cuda-12.4
```

---

## 2. 检查 CUDA / 编译环境

```bash
cmake --version
gcc --version | head -n 1
g++ --version | head -n 1
ls -ld /usr/local/cuda*
find /usr/local -name nvcc 2>/dev/null | head
ldconfig -p | egrep 'libcuda|libcudart|libcublas|libcurand|libcusparse' || true
```

设置 CUDA 环境变量：

```bash
export CUDA_HOME=/usr/local/cuda-12.4
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$CUDA_HOME/targets/x86_64-linux/lib:$LD_LIBRARY_PATH
which nvcc
nvcc --version
```

---

## 3. 检查模型文件

```bash
find /data1 -type f -name '*Qwen3.6*gguf' 2>/dev/null | sort
find /data1 -type f -name '*mmproj*.gguf' 2>/dev/null | sort
```

应存在：

```bash
/data1/ollama/models/qwen36-35b-a3b-uncensored/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
/data1/ollama/models/qwen36-35b-a3b-uncensored/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf
```

---

## 4. 停用 Ollama

```bash
sudo systemctl stop ollama
sudo systemctl disable ollama
pkill -f ollama || true
nvidia-smi
```

---

## 5. 安装基础工具

```bash
sudo apt update
sudo apt install -y git build-essential cmake curl wget unzip
```

---

## 6. 下载 llama.cpp 源码

### 方案 A：直接 GitHub

```bash
mkdir -p /data1/apps
cd /data1/apps
git clone https://github.com/ggerganov/llama.cpp
```

### 方案 B：使用 GitHub 文件加速代理

```bash
mkdir -p /data1/apps
cd /data1/apps
wget -O llama.cpp.zip 'https://micromatrix.gq/https://github.com/ggerganov/llama.cpp/archive/refs/heads/master.zip'
unzip llama.cpp.zip
rm -rf llama.cpp
mv llama.cpp-master llama.cpp
```

如果目录名不同：

```bash
DIR=$(find . -maxdepth 1 -type d -name 'llama.cpp*' ! -name 'llama.cpp' | head -n 1)
rm -rf llama.cpp
mv "$DIR" llama.cpp
```

---

## 7. 编译 CUDA 版 llama.cpp

V100 Compute Capability 为 7.0，所以使用 `-DCMAKE_CUDA_ARCHITECTURES=70`。

```bash
export CUDA_HOME=/usr/local/cuda-12.4
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$CUDA_HOME/targets/x86_64-linux/lib:$LD_LIBRARY_PATH

cd /data1/apps/llama.cpp
rm -rf build

cmake -B build   -DGGML_CUDA=ON   -DCMAKE_CUDA_ARCHITECTURES=70   -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j$(nproc)
```

成功标志：

```text
Built target llama-server
Built target llama-cli
```

---

## 8. 检查编译产物

```bash
ls -lh /data1/apps/llama.cpp/build/bin/llama-server
ls -lh /data1/apps/llama.cpp/build/bin/llama-cli
ldd /data1/apps/llama.cpp/build/bin/llama-server | egrep 'cuda|cublas|ggml'
```

应看到：

```text
libggml-cuda.so.0
libcudart.so.12
libcublas.so.12
libcuda.so.1
libcublasLt.so.12
```

---

## 9. 创建启动脚本

推荐单人使用配置：`-c 98304 -np 1`。

```bash
sudo tee /data1/apps/start_qwen36_llama_server.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

export CUDA_VISIBLE_DEVICES=0,1
export CUDA_HOME=/usr/local/cuda-12.4
export LD_LIBRARY_PATH=/usr/local/cuda-12.4/lib64:/usr/local/cuda-12.4/targets/x86_64-linux/lib:/data1/apps/llama.cpp/build/bin:${LD_LIBRARY_PATH:-}

cd /data1/ollama/models/qwen36-35b-a3b-uncensored

exec /data1/apps/llama.cpp/build/bin/llama-server   -m /data1/ollama/models/qwen36-35b-a3b-uncensored/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf   --mmproj /data1/ollama/models/qwen36-35b-a3b-uncensored/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf   --jinja   -c 98304   -ngl 99   -np 1   -t 28   -tb 28   --host 0.0.0.0   --port 8080
EOF

sudo chmod +x /data1/apps/start_qwen36_llama_server.sh
```

如果 `-np` 不支持：

```bash
/data1/apps/llama.cpp/build/bin/llama-server --help | grep -i parallel
```

然后将 `-np 1` 替换为 `--parallel 1`。

---

## 10. 手动启动

```bash
bash /data1/apps/start_qwen36_llama_server.sh
```

正常日志应包含：

```text
CUDA0 : Tesla V100-SXM2-32GB
CUDA1 : Tesla V100-SXM2-32GB
loaded multimodal model
server is listening on http://0.0.0.0:8080
```

---

## 11. 测试模型列表

```bash
curl http://127.0.0.1:8080/v1/models
```

应看到模型：

```text
Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
```

如果启动参数为 `-c 98304`，返回 JSON 中应看到类似：

```json
"n_ctx": 98304
```

---

## 12. 测试文本接口

```bash
curl http://127.0.0.1:8080/v1/chat/completions   -H 'Content-Type: application/json'   -d '{
    "model": "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf",
    "messages": [
      {"role": "user", "content": "用一句话回答：你是否正常运行？"}
    ],
    "temperature": 0.4,
    "stream": false
  }'
```

---

## 13. 测试图片多模态

不要把图片 base64 直接塞进命令行，否则可能报 `Argument list too long`。

```bash
python3 - <<'PY'
import base64, json
img_path = "/tmp/test.jpeg"
with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
payload = {
    "model": "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "请描述这张图片的主要内容。用中文回答。"},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}
        ]
    }],
    "temperature": 0.3,
    "stream": False
}
with open("/tmp/vision_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)
PY

curl http://127.0.0.1:8080/v1/chat/completions   -H 'Content-Type: application/json'   --data-binary @/tmp/vision_payload.json
```

---

## 14. 配置 systemd 服务

真实脚本路径是：

```bash
/data1/apps/start_qwen36_llama_server.sh
```

创建服务：

```bash
sudo tee /etc/systemd/system/qwen36-llama-server.service >/dev/null <<'EOF'
[Unit]
Description=Qwen3.6 HauhauCS llama-server multimodal service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/data1/apps

ExecStart=/data1/apps/start_qwen36_llama_server.sh

Restart=always
RestartSec=3

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

启动并设为开机自启：

```bash
sudo chmod +x /data1/apps/start_qwen36_llama_server.sh
sudo systemctl daemon-reload
sudo systemctl reset-failed qwen36-llama-server
sudo systemctl start qwen36-llama-server
systemctl status qwen36-llama-server --no-pager
sudo systemctl enable qwen36-llama-server
```

看日志：

```bash
sudo journalctl -u qwen36-llama-server -f
```

---

## 15. 修改参数后如何重启

当你修改了启动脚本：

```bash
/data1/apps/start_qwen36_llama_server.sh
```

例如把：

```bash
-c 131072
-np 4
```

改成：

```bash
-c 98304
-np 1
```

需要重启才会生效。

### 15.1 手动启动模式

```bash
pkill -f llama-server || true
ss -lntp | grep 8080 || true
bash /data1/apps/start_qwen36_llama_server.sh
```

验证：

```bash
curl http://127.0.0.1:8080/v1/models
nvidia-smi
```

### 15.2 systemd 启动模式

```bash
sudo systemctl restart qwen36-llama-server
systemctl status qwen36-llama-server --no-pager
curl http://127.0.0.1:8080/v1/models
sudo journalctl -u qwen36-llama-server -n 100 --no-pager
```

### 15.3 不确定是谁启动

```bash
ps -ef | grep llama-server | grep -v grep
```

如果是手动启动：

```bash
pkill -f llama-server || true
bash /data1/apps/start_qwen36_llama_server.sh
```

如果是 systemd 管理：

```bash
sudo systemctl restart qwen36-llama-server
```

### 15.4 确认参数生效

```bash
curl http://127.0.0.1:8080/v1/models
```

如果设置为 `-c 98304`，应看到类似：

```json
"n_ctx": 98304
```

---

## 16. Hermes 配置

Hermes 里选择：

```text
Custom OpenAI-compatible endpoint
```

填写：

```text
API base URL: http://192.168.1.30:8080/v1
API key: local
Compatibility mode: 2. Chat Completions
Context length: 98304
Model: Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
Display name: Qwen3.6-35B-A3B-Q6-VL-96K
```

Hermes 所在机器验证：

```bash
curl http://192.168.1.30:8080/v1/models
```

---

## 17. 推荐参数说明

### 单人使用推荐默认

```bash
-c 98304
-np 1
```

说明：

```text
-np 1：只开 1 个 parallel slot。
单人使用时更稳，避免多个 slot 抢 KV cache 和显存。
98304：比 64K 宽裕，又比 131K 更轻。
```

### 超长文档专项

```bash
-c 131072
-np 1
```

适合长 Markdown、长 JSON、长代码审阅，但 Hermes 初始化可能更慢。

### 多人轻度使用

```bash
-c 65536
-np 2
```

单人使用没有必要开 `-np 4`。

---

## 18. 常见问题排查

### systemd inactive dead

```bash
systemctl status qwen36-llama-server --no-pager
sudo journalctl -u qwen36-llama-server -b -n 100 --no-pager
sudo systemctl cat qwen36-llama-server
```

重点确认：

```ini
ExecStart=/data1/apps/start_qwen36_llama_server.sh
```

不要写成：

```ini
ExecStart=/data1/apps/llama.cpp/start_qwen36_llama_server.sh
```

### 端口被占用

```bash
ss -lntp | grep 8080 || true
ps -ef | grep llama-server | grep -v grep || true
pkill -f llama-server || true
```

### 图片请求 Argument list too long

使用：

```bash
curl --data-binary @/tmp/vision_payload.json
```

### Hermes 卡在 synthesizing

建议：

```bash
-c 98304
-np 1
```

任务提示中写：

```text
只输出最终结果，不要输出 reasoning、analysis 或思考过程。
```

不要强依赖 `/no_think`，避免影响无约束模型稳定性。

---

## 19. 多模型说明

当前方式：

```bash
llama-server -m xxx.gguf
```

代表一个服务固定加载一个模型。多模型方案：

```text
方案 A：多个 llama-server，不同端口，最稳。
方案 B：llama-server Router Mode，后续再评估。
方案 C：llama-swap 代理层，更接近 Ollama 的模型选择体验。
```

---

## 20. 最终验证清单

```bash
systemctl status qwen36-llama-server --no-pager
curl http://127.0.0.1:8080/v1/models
nvidia-smi
```

应满足：

```text
systemd: active (running)
/v1/models: 返回 Qwen3.6 模型
capabilities: completion, multimodal
nvidia-smi: llama-server 占用两张 V100
```

---

## 21. 快速命令汇总

### 重启 systemd 服务

```bash
sudo systemctl restart qwen36-llama-server
```

### 手动重启

```bash
pkill -f llama-server || true
bash /data1/apps/start_qwen36_llama_server.sh
```

### 查看模型

```bash
curl http://127.0.0.1:8080/v1/models
```

### 看显卡

```bash
nvidia-smi
```

### 看日志

```bash
sudo journalctl -u qwen36-llama-server -f
```
