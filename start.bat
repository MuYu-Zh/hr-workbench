@echo off
chcp 65001 >nul
title liqianyu 的人事工作台 - 本地启动
echo.
echo  ============================================
echo    liqianyu 的人事工作台 · 本地启动
echo  ============================================
echo.
echo  启动后请在浏览器打开: http://localhost:8765
echo  提示：使用 Chrome 或 Edge 打开，可点击地址栏
echo        右侧的安装图标，将工作台"安装为应用"，
echo        并可在系统设置中启用"文件存储模式"
echo        （数据写入你指定的文件夹）。
echo.
echo  按任意键启动... 关闭此窗口即停止服务
pause >nul

where python >nul 2>nul
if %errorlevel%==0 (
  echo [启动] 使用 Python HTTP 服务...
  python -m http.server 8765 --bind 127.0.0.1
) else (
  where npx >nul 2>nul
  if %errorlevel%==0 (
    echo [启动] 使用 npx serve...
    npx serve -l 8765 --no-clipboard .
  ) else (
    echo [错误] 未找到 python 或 npx，请安装 Python 或 Node.js 后重试。
    pause
  )
)
