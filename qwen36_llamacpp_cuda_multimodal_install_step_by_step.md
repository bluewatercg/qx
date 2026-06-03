# Linux + llama.cpp CUDA 多模态局域网模型服务安装手册

> 目标：从 0 开始，在 Linux 服务器上编译 CUDA 版 llama.cpp，并部署 `Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf` + `mmproj`，通过 `llama-server` 提供 OpenAI-compatible API，供 Hermes / OpenWebUI / Continue 等局域网客户端调用。

---

## 目录

1. [最终架构](#1-最终架构)
2. [服务器环境检查](#2-服务器环境检查)
3. [模型文件检查](#3-模型文件检查)
4. [停用 Ollama](#4-停用-ollama)
5. [安装基础工具](#5-安装基础工具)
6. [配置 CUDA 环境](#6-配置-cuda-环境)
7. [下载 llama.cpp 源码](#7-下载-llamacpp-源码)
8. [解压源码](#8-解压源码)
9. [编译 CUDA 版 llama.cpp](#9-编译-cuda-版-llamacpp)
10. [检查编译产物](#10-检查编译产物)
11. [创建启动脚本](#11-创建启动脚本)
12. [手动启动服务](#12-手动启动服务)
13. [测试 OpenAI-compatible API](#13-测试-openai-compatible-api)
14. [测试多模态图片识别](#14-测试多模态图片识别)
15. [配置 systemd 服务](#15-配置-systemd-服务)
16. [Hermes 配置](#16-hermes-配置)
17. [常见问题排查](#17-常见问题排查)
18. [推荐稳定参数](#18-推荐稳定参数)
19. [多模型说明](#19-多模型说明)
20. [最终验证清单](#20-最终验证清单)

---

## 1. 最终架构

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

本手册采用：

```text
模型目录：/data1/ollama/models/qwen36-35b-a3b-uncensored
源码目录：/data1/apps/llama.cpp
启动脚本：/data1/apps/start_qwen36_llama_server.sh
服务端口：8080
```

---

## 2. 服务器环境检查

执行：

```bash
lscpu | egrep 'Model name|CPU\(s\)|Core|Thread|NUMA'
free -h
nvidia-smi
nvidia-smi -L
nvidia-smi topo -m
nvidia-smi nvlink --status 2>/dev/null || true
```

推荐环境：

```text
CPU: 多核心 x86_64
内存: 128GB+，本次实测为 251Gi
GPU: NVIDIA Tesla V100-SXM2-32GB × 2
驱动: 550.163.01
CUDA: 12.4
NVLink: GPU0 <-> GPU1 为 NV6
```

---

## 3. 模型文件检查

主模型：

```bash
/data1/ollama/models/qwen36-35b-a3b-uncensored/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
```

多模态 projector：

```bash
/data1/ollama/models/qwen36-35b-a3b-uncensored/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf
```

检查：

```bash
find /data1 -type f -name '*Qwen3.6*gguf' 2>/dev/null | sort
find /data1 -type f -name '*mmproj*.gguf' 2>/dev/null | sort
```

如果 `mmproj` 不存在，多模态图片识别无法启用，只能跑文本。

---

## 4. 停用 Ollama

如果之前用 Ollama 跑过模型，先释放显存：

```bash
sudo systemctl stop ollama
sudo systemctl disable ollama
pkill -f ollama || true
nvidia-smi
```

确认 `nvidia-smi` 里没有：

```text
/usr/local/bin/ollama
```

---

## 5. 安装基础工具

```bash
sudo apt update
sudo apt install -y git build-essential cmake curl wget unzip
```

检查：

```bash
cmake --version
gcc --version | head -n 1
g++ --version | head -n 1
```

---

## 6. 配置 CUDA 环境

先确认 CUDA：

```bash
ls -ld /usr/local/cuda*
find /usr/local -name nvcc 2>/dev/null | head
ldconfig -p | egrep 'libcuda|libcudart|libcublas|libcurand|libcusparse' || true
```

本次实测 CUDA 路径：

```bash
/usr/local/cuda-12.4
```

设置当前 shell 环境：

```bash
export CUDA_HOME=/usr/local/cuda-12.4
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$CUDA_HOME/targets/x86_64-linux/lib:$LD_LIBRARY_PATH
```

验证：

```bash
which nvcc
nvcc --version
```

如需永久生效：

```bash
cat >> ~/.bashrc <<'EOF'

# CUDA 12.4
export CUDA_HOME=/usr/local/cuda-12.4
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$CUDA_HOME/targets/x86_64-linux/lib:$LD_LIBRARY_PATH
EOF

source ~/.bashrc
```

---

## 7. 下载 llama.cpp 源码

### 方案 A：直接 GitHub

```bash
mkdir -p /data1/apps
cd /data1/apps
git clone https://github.com/ggerganov/llama.cpp
```

### 方案 B：使用 GitHub 文件加速代理

如 GitHub 访问慢，可用：

```bash
mkdir -p /data1/apps
cd /data1/apps

wget -O llama.cpp.zip \
'https://micromatrix.gq/https://github.com/ggerganov/llama.cpp/archive/refs/heads/master.zip'
```

---

## 8. 解压源码

```bash
cd /data1/apps
unzip llama.cpp.zip

find . -maxdepth 1 -type d -name 'llama.cpp*' -print
rm -rf llama.cpp
mv llama.cpp-master llama.cpp
```

如果目录名不确定：

```bash
cd /data1/apps
DIR=$(find . -maxdepth 1 -type d -name 'llama.cpp*' ! -name 'llama.cpp' | head -n 1)
echo "$DIR"
rm -rf llama.cpp
mv "$DIR" llama.cpp
```

最终源码目录：

```bash
/data1/apps/llama.cpp
```

---

## 9. 编译 CUDA 版 llama.cpp

V100 是 Volta，Compute Capability 为 `7.0`，所以使用：

```text
-DCMAKE_CUDA_ARCHITECTURES=70
```

执行：

```bash
cd /data1/apps/llama.cpp

rm -rf build

cmake -B build \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=70 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j$(nproc)
```

成功标志：

```text
Built target llama-server
Built target llama-cli
```

常见 warning 说明：

```text
NCCL not found
```

这只表示多 GPU 通信性能可能不是最优，不影响启动。

```text
OpenSSL not found, HTTPS support disabled
```

不影响本地 HTTP 服务。

```text
UI: no assets available
```

不影响 `/v1/chat/completions` API。

---

## 10. 检查编译产物

```bash
ls -lh /data1/apps/llama.cpp/build/bin/llama-server
ls -lh /data1/apps/llama.cpp/build/bin/llama-cli
```

检查 CUDA 链接：

```bash
ldd /data1/apps/llama.cpp/build/bin/llama-server | egrep 'cuda|cublas|ggml'
```

应看到类似：

```text
libggml-cuda.so.0
libcudart.so.12
libcublas.so.12
libcuda.so.1
libcublasLt.so.12
```

---

## 11. 创建启动脚本

> 推荐先用 `65536` 上下文和 `-np 1` 跑稳 Hermes。确认稳定后，再考虑改成 `131072`。

```bash
sudo tee /data1/apps/start_qwen36_llama_server.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

export CUDA_VISIBLE_DEVICES=0,1
export CUDA_HOME=/usr/local/cuda-12.4
export LD_LIBRARY_PATH=/usr/local/cuda-12.4/lib64:/usr/local/cuda-12.4/targets/x86_64-linux/lib:/data1/apps/llama.cpp/build/bin:${LD_LIBRARY_PATH:-}

cd /data1/ollama/models/qwen36-35b-a3b-uncensored

exec /data1/apps/llama.cpp/build/bin/llama-server \
  -m /data1/ollama/models/qwen36-35b-a3b-uncensored/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf \
  --mmproj /data1/ollama/models/qwen36-35b-a3b-uncensored/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf \
  --jinja \
  -c 65536 \
  -ngl 99 \
  -np 1 \
  -t 28 \
  -tb 28 \
  --host 0.0.0.0 \
  --port 8080
EOF

sudo chmod +x /data1/apps/start_qwen36_llama_server.sh
```

如果你的 llama-server 不支持 `-np`，先查：

```bash
/data1/apps/llama.cpp/build/bin/llama-server --help | grep -i parallel
```

然后将：

```bash
-np 1
```

替换为：

```bash
--parallel 1
```

---

## 12. 手动启动服务

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

另开一个终端继续测试。

---

## 13. 测试 OpenAI-compatible API

### 查看模型列表

```bash
curl http://127.0.0.1:8080/v1/models
```

应看到模型 ID：

```text
Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
```

并看到能力：

```text
completion
multimodal
```

### 文本测试

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf",
    "messages": [
      {
        "role": "user",
        "content": "用一句话回答：你是否正常运行？"
      }
    ],
    "temperature": 0.4,
    "stream": false
  }'
```

---

## 14. 测试多模态图片识别

不要把图片 base64 直接塞进 `curl -d`，否则容易报：

```text
Argument list too long
```

正确做法：先生成 JSON 文件。

```bash
python3 - <<'PY'
import base64, json

img_path = "/tmp/test.jpeg"

with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

payload = {
    "model": "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "请描述这张图片的主要内容。用中文回答。"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/jpeg;base64," + b64
                    }
                }
            ]
        }
    ],
    "temperature": 0.3,
    "stream": False
}

with open("/tmp/vision_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

print("payload written to /tmp/vision_payload.json")
print("base64 length:", len(b64))
PY
```

请求：

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/vision_payload.json
```

成功后会返回图片描述。

---

## 15. 配置 systemd 服务

> 注意：本次排错中，service 曾经写错为 `/data1/apps/llama.cpp/start_qwen36_llama_server.sh`，但真实脚本路径是 `/data1/apps/start_qwen36_llama_server.sh`。

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

启动：

```bash
sudo chmod +x /data1/apps/start_qwen36_llama_server.sh
sudo systemctl daemon-reload
sudo systemctl reset-failed qwen36-llama-server
sudo systemctl start qwen36-llama-server
systemctl status qwen36-llama-server --no-pager
```

如果正常，应看到：

```text
Active: active (running)
```

设置开机启动：

```bash
sudo systemctl enable qwen36-llama-server
```

查看日志：

```bash
sudo journalctl -u qwen36-llama-server -f
```

---

## 16. Hermes 配置

Hermes 里选择：

```text
Custom OpenAI-compatible endpoint
```

填写：

```text
API base URL:
http://192.168.1.30:8080/v1

API key:
local
```

Compatibility mode 选择：

```text
2. Chat Completions
```

不要选：

```text
3. Responses / Codex
```

Context length 推荐先填：

```text
65536
```

Model：

```text
Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf
```

Display name 推荐：

```text
Qwen3.6-35B-A3B-Q6-VL-64K
```

如果启动参数改成 `-c 131072`，Hermes context length 可同步改为：

```text
131072
```

---

## 17. 常见问题排查

### 17.1 `curl: Argument list too long`

原因：图片 base64 太长，不能直接放命令行。

解决：先写 `/tmp/vision_payload.json`，再：

```bash
curl --data-binary @/tmp/vision_payload.json
```

---

### 17.2 systemd 显示 inactive dead

检查：

```bash
systemctl status qwen36-llama-server --no-pager
sudo journalctl -u qwen36-llama-server -b -n 100 --no-pager
sudo systemctl cat qwen36-llama-server
```

重点确认：

```ini
ExecStart=/data1/apps/start_qwen36_llama_server.sh
```

而不是：

```ini
ExecStart=/data1/apps/llama.cpp/start_qwen36_llama_server.sh
```

---

### 17.3 端口被占用

```bash
ss -lntp | grep 8080 || true
ps -ef | grep llama-server | grep -v grep || true
```

停止旧进程：

```bash
pkill -f llama-server || true
```

---

### 17.4 Hermes 卡在 synthesizing

原因通常是：

```text
131K 上下文 + 自动多并发 slot + Agent 初始化提示过重
```

解决：

```bash
-c 65536
-np 1
```

Hermes context 同步设为：

```text
65536
```

---

### 17.5 找不到 mmproj

```bash
find /data1 -type f -name '*mmproj*.gguf' 2>/dev/null | sort
```

没有 mmproj 时只能跑文本，不能跑图片。

---

## 18. 推荐稳定参数

### 稳定版，推荐给 Hermes

```bash
-c 65536
-ngl 99
-np 1
-t 28
-tb 28
```

### 长上下文实验版

```bash
-c 131072
-ngl 99
-np 1
-t 28
-tb 28
```

如果 131K 下 Hermes 初始化慢或中断，退回 64K。

---

## 19. 多模型说明

当前这种启动方式：

```bash
llama-server -m xxx.gguf
```

代表：

```text
一个 llama-server 服务固定加载一个模型
```

即使请求里写：

```json
"model": "local-model"
```

也不会像 Ollama 一样自动切换多个模型。

多模型有三种方案：

### 方案 A：多个端口，最稳

```text
8080 → Qwen3.6 多模态
8081 → Coder 模型
8082 → 小模型
```

### 方案 B：llama-server Router Mode

新版 llama-server 有 router mode，可通过 `--models-dir`、`--models-preset`、`--models-max` 动态管理多个模型。适合普通 GGUF 多模型，但你当前这个多模态大模型涉及 `mmproj` 和长上下文，建议后续再评估。

### 方案 C：llama-swap

用代理层按 `model` 字段切换多个后端，更接近 Ollama 体验。

---

## 20. 最终验证清单

执行：

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

Hermes 所在机器验证：

```bash
curl http://192.168.1.30:8080/v1/models
```

如果能返回模型列表，Hermes 可接入。

---

# 附录：关键路径

```bash
# llama.cpp
/data1/apps/llama.cpp

# llama-server
/data1/apps/llama.cpp/build/bin/llama-server

# 启动脚本
/data1/apps/start_qwen36_llama_server.sh

# 主模型
/data1/ollama/models/qwen36-35b-a3b-uncensored/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q6_K_P.gguf

# mmproj
/data1/ollama/models/qwen36-35b-a3b-uncensored/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf

# systemd service
/etc/systemd/system/qwen36-llama-server.service

# API
http://192.168.1.30:8080/v1
```

---

# 附录：参考资料

- llama.cpp server README：说明 llama.cpp HTTP server 提供 OpenAI-compatible chat completions、responses、embeddings、multimodal、function calling 等能力。
- HauhauCS Qwen3.6 模型卡：列出 Q6_K_P 主 GGUF 文件和 mmproj f16 文件。
- llama.cpp Router Mode 资料：说明新版 llama-server 支持 router mode，可通过 models-dir / models-preset 管理多模型。
- llama-swap 项目：可作为多个 OpenAI-compatible 后端之间的模型切换代理。
