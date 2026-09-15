import sys
import os
import json
import subprocess
import webbrowser
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QTabWidget, QTableWidget,
    QTableWidgetItem, QHeaderView, QMessageBox, QGroupBox, QComboBox,
    QSpinBox, QCheckBox
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QColor, QIcon
import database

def load_config():
    cfg_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    return {}

def save_config(cfg):
    cfg_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

class BotWorkerThread(QThread):
    output_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(int)

    def __init__(self):
        super().__init__()
        self.process = None
        self._is_running = True

    def run(self):
        cmd = [sys.executable, "-u", "bot.py"]
        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=os.path.dirname(__file__)
        )

        for line in self.process.stdout:
            if not self._is_running:
                break
            self.output_signal.emit(line.rstrip())

        self.process.wait()
        self.finished_signal.emit(self.process.returncode)

    def stop(self):
        self._is_running = False
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Zen2K Discord Ticket & Server Tool (Made by officialZen2K)")
        self.resize(960, 680)
        self.bot_thread = None
        self.init_ui()
        self.load_config_values()
        self.refresh_tickets()

    def init_ui(self):
        self.setStyleSheet("""
            QMainWindow, QWidget {
                background-color: #1e1f22;
                color: #dbdee1;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 13px;
            }
            QTabWidget::pane {
                border: 1px solid #2b2d31;
                background-color: #2b2d31;
                border-radius: 6px;
            }
            QTabBar::tab {
                background: #1e1f22;
                color: #949ba4;
                padding: 10px 20px;
                font-weight: bold;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background: #2b2d31;
                color: #ffffff;
                border-bottom: 2px solid #5865f2;
            }
            QGroupBox {
                border: 1px solid #35373c;
                border-radius: 6px;
                margin-top: 14px;
                padding: 14px;
                font-weight: bold;
                color: #f2f3f5;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 4px;
            }
            QLineEdit, QComboBox, QSpinBox {
                background-color: #1e1f22;
                border: 1px solid #3f4147;
                border-radius: 4px;
                padding: 8px;
                color: #f2f3f5;
            }
            QLineEdit:focus, QComboBox:focus, QSpinBox:focus {
                border: 1px solid #5865f2;
            }
            QPushButton {
                background-color: #5865f2;
                color: #ffffff;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #4752c4;
            }
            QPushButton:pressed {
                background-color: #3c45a5;
            }
            QPushButton#dangerBtn {
                background-color: #da373c;
            }
            QPushButton#dangerBtn:hover {
                background-color: #a12828;
            }
            QPushButton#successBtn {
                background-color: #23a55a;
            }
            QPushButton#successBtn:hover {
                background-color: #1b8547;
            }
            QTableWidget {
                background-color: #1e1f22;
                border: 1px solid #35373c;
                border-radius: 4px;
                gridline-color: #2b2d31;
                color: #dbdee1;
            }
            QHeaderView::section {
                background-color: #2b2d31;
                color: #949ba4;
                padding: 6px;
                font-weight: bold;
                border: none;
            }
            QTextEdit {
                background-color: #111214;
                border: 1px solid #232428;
                border-radius: 6px;
                font-family: Consolas, 'Courier New', monospace;
                color: #57f287;
                font-size: 12px;
            }
        """)

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)

        # Header Title Banner
        header = QHBoxLayout()
        title = QLabel("⚡ ZEN2K DISCORD TICKET & SERVER TOOL • MADE BY OFFICIALZEN2K")
        title.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        title.setStyleSheet("color: #5865f2;")
        header.addWidget(title)

        header.addStretch()
        self.status_lbl = QLabel("STATUS: OFFLINE")
        self.status_lbl.setStyleSheet("color: #da373c; font-weight: bold; padding: 4px 10px; background: #2b2d31; border-radius: 4px;")
        header.addWidget(self.status_lbl)
        main_layout.addLayout(header)

        # Tab Widget
        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs)

        # Tabs Setup
        self.setup_control_tab()
        self.setup_tickets_tab()
        self.setup_settings_tab()
        self.setup_channels_tab()

    def setup_control_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Bot Control Box
        box = QGroupBox("Bot Credentials & Control")
        box_layout = QVBoxLayout(box)

        token_layout = QHBoxLayout()
        token_layout.addWidget(QLabel("Bot Token:"))
        self.token_input = QLineEdit()
        self.token_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.token_input.setPlaceholderText("Paste your Discord Bot Token here...")
        token_layout.addWidget(self.token_input)

        self.toggle_token_btn = QPushButton("Show")
        self.toggle_token_btn.setFixedWidth(60)
        self.toggle_token_btn.clicked.connect(self.toggle_token_visibility)
        token_layout.addWidget(self.toggle_token_btn)
        box_layout.addLayout(token_layout)

        # Buttons
        btn_layout = QHBoxLayout()
        self.start_btn = QPushButton("▶ Launch Bot")
        self.start_btn.setObjectName("successBtn")
        self.start_btn.clicked.connect(self.start_bot)
        btn_layout.addWidget(self.start_btn)

        self.stop_btn = QPushButton("⏹ Stop Bot")
        self.stop_btn.setObjectName("dangerBtn")
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self.stop_bot)
        btn_layout.addWidget(self.stop_btn)

        self.save_btn = QPushButton("💾 Save Token")
        self.save_btn.clicked.connect(self.save_token_only)
        btn_layout.addWidget(self.save_btn)

        box_layout.addLayout(btn_layout)
        layout.addWidget(box)

        # Console Output Box
        console_box = QGroupBox("Real-time Bot Logs")
        c_layout = QVBoxLayout(console_box)
        self.console = QTextEdit()
        self.console.setReadOnly(True)
        c_layout.addWidget(self.console)

        clear_btn = QPushButton("Clear Console")
        clear_btn.clicked.connect(self.console.clear)
        c_layout.addWidget(clear_btn, alignment=Qt.AlignmentFlag.AlignRight)

        layout.addWidget(console_box)
        self.tabs.addTab(tab, "🎮 Bot Control")

    def toggle_token_visibility(self):
        if self.token_input.echoMode() == QLineEdit.EchoMode.Password:
            self.token_input.setEchoMode(QLineEdit.EchoMode.Normal)
            self.toggle_token_btn.setText("Hide")
        else:
            self.token_input.setEchoMode(QLineEdit.EchoMode.Password)
            self.toggle_token_btn.setText("Show")

    def setup_tickets_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Stats Bar
        self.stats_bar = QHBoxLayout()
        self.stat_total = QLabel("Total Tickets: 0")
        self.stat_open = QLabel("Open: 0")
        self.stat_closed = QLabel("Closed: 0")
        self.stat_claimed = QLabel("Claimed: 0")

        for lbl in [self.stat_total, self.stat_open, self.stat_closed, self.stat_claimed]:
            lbl.setStyleSheet("background-color: #1e1f22; border: 1px solid #35373c; padding: 6px 12px; border-radius: 4px; font-weight: bold;")
            self.stats_bar.addWidget(lbl)

        layout.addLayout(self.stats_bar)

        # Table
        self.ticket_table = QTableWidget()
        self.ticket_table.setColumnCount(7)
        self.ticket_table.setHorizontalHeaderLabels(["ID", "Ticket #", "Category", "Author", "Priority", "Status", "Claimed By"])
        self.ticket_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        layout.addWidget(self.ticket_table)

        # Actions
        act_layout = QHBoxLayout()
        refresh_btn = QPushButton("🔄 Refresh Tickets")
        refresh_btn.clicked.connect(self.refresh_tickets)
        act_layout.addWidget(refresh_btn)

        open_trans_dir_btn = QPushButton("📁 Open Transcripts Folder")
        open_trans_dir_btn.clicked.connect(self.open_transcripts_folder)
        act_layout.addWidget(open_trans_dir_btn)

        layout.addLayout(act_layout)
        self.tabs.addTab(tab, "🎫 Ticket Monitor")

    def setup_settings_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        box = QGroupBox("Ticket Configuration Settings")
        form = QVBoxLayout(box)

        # Ticket Category
        row1 = QHBoxLayout()
        row1.addWidget(QLabel("Ticket Category Name:"))
        self.cat_name_input = QLineEdit()
        row1.addWidget(self.cat_name_input)
        form.addLayout(row1)

        # Staff Role ID
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("Staff Role ID:"))
        self.staff_id_input = QLineEdit()
        self.staff_id_input.setPlaceholderText("e.g. 123456789012345678")
        row2.addWidget(self.staff_id_input)
        form.addLayout(row2)

        # Transcript Channel ID
        row3 = QHBoxLayout()
        row3.addWidget(QLabel("Transcript Log Channel ID:"))
        self.transcript_id_input = QLineEdit()
        self.transcript_id_input.setPlaceholderText("e.g. 123456789012345678")
        row3.addWidget(self.transcript_id_input)
        form.addLayout(row3)

        # Status text
        row4 = QHBoxLayout()
        row4.addWidget(QLabel("Bot Status Presence:"))
        self.status_text_input = QLineEdit()
        row4.addWidget(self.status_text_input)
        form.addLayout(row4)

        save_settings_btn = QPushButton("💾 Save Configuration")
        save_settings_btn.setObjectName("successBtn")
        save_settings_btn.clicked.connect(self.save_full_config)
        form.addWidget(save_settings_btn)

        layout.addWidget(box)
        layout.addStretch()
        self.tabs.addTab(tab, "⚙️ Settings")

    def setup_channels_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        box = QGroupBox("Discord Channel Management Guide & Quick Commands")
        b_layout = QVBoxLayout(box)

        guide = QLabel("""
<h3>🚀 Discord Slash Commands Available:</h3>
<ul>
  <li><b>/setup-tickets</b> - Automatically deploys the interactive ticket creation panel with the dropdown and buttons into any channel.</li>
  <li><b>/ticket close [reason]</b> - Closes the current ticket, generates full styled HTML transcript, DMs the user, logs to archives, and deletes channel.</li>
  <li><b>/ticket claim</b> - Staff claims or unclaims ownership of the ticket.</li>
  <li><b>/ticket transcript</b> - Instantly exports HTML & TXT transcript into the channel.</li>
  <li><b>/ticket add &lt;user&gt;</b> - Adds a member to the ticket channel.</li>
  <li><b>/ticket remove &lt;user&gt;</b> - Removes a member from the ticket channel.</li>
  <li><b>/ticket rename &lt;name&gt;</b> - Quickly renames the ticket channel.</li>
  <li><b>/ticket stats</b> - Shows overall server ticket statistics.</li>
  <li><b>/channel create &lt;name&gt; [type] [category] [private]</b> - Creates new text or voice channels with fine-grained permissions.</li>
  <li><b>/channel delete [channel]</b> - Deletes target channel.</li>
  <li><b>/channel purge &lt;amount&gt;</b> - Fast bulk message cleanup (1-100 messages).</li>
  <li><b>/channel lock / unlock</b> - Instant lockdown for channels.</li>
  <li><b>/channel slowmode &lt;seconds&gt;</b> - Sets channel rate limit.</li>
  <li><b>/channel clone [channel]</b> - Clones identical channel settings.</li>
</ul>
        """)
        guide.setTextFormat(Qt.TextFormat.RichText)
        b_layout.addWidget(guide)
        layout.addWidget(box)
        layout.addStretch()
        self.tabs.addTab(tab, "📁 Commands & Channels")

    def load_config_values(self):
        cfg = load_config()
        self.token_input.setText(cfg.get("token", ""))
        self.cat_name_input.setText(cfg.get("ticket_category_name", "🎫 TICKETS"))
        self.staff_id_input.setText(str(cfg.get("staff_role_id", 0) or ""))
        self.transcript_id_input.setText(str(cfg.get("transcript_channel_id", 0) or ""))
        self.status_text_input.setText(cfg.get("status_text", "Managing Tickets | /setup-tickets"))

    def save_token_only(self):
        cfg = load_config()
        cfg["token"] = self.token_input.text().strip()
        save_config(cfg)
        QMessageBox.information(self, "Saved", "Bot token saved successfully.")

    def save_full_config(self):
        cfg = load_config()
        cfg["ticket_category_name"] = self.cat_name_input.text().strip() or "🎫 TICKETS"
        try:
            cfg["staff_role_id"] = int(self.staff_id_input.text().strip() or 0)
        except ValueError:
            cfg["staff_role_id"] = 0
        try:
            cfg["transcript_channel_id"] = int(self.transcript_id_input.text().strip() or 0)
        except ValueError:
            cfg["transcript_channel_id"] = 0
        cfg["status_text"] = self.status_text_input.text().strip()
        save_config(cfg)
        QMessageBox.information(self, "Saved", "Settings saved successfully.")

    def start_bot(self):
        token = self.token_input.text().strip()
        if not token or token == "YOUR_BOT_TOKEN_HERE":
            QMessageBox.warning(self, "Missing Token", "Please enter a valid Discord Bot Token before starting.")
            return

        cfg = load_config()
        cfg["token"] = token
        save_config(cfg)

        self.console.append("[*] Launching bot worker thread...")
        self.bot_thread = BotWorkerThread()
        self.bot_thread.output_signal.connect(self.handle_bot_output)
        self.bot_thread.finished_signal.connect(self.handle_bot_finished)
        self.bot_thread.start()

        self.status_lbl.setText("STATUS: ONLINE")
        self.status_lbl.setStyleSheet("color: #23a55a; font-weight: bold; padding: 4px 10px; background: #2b2d31; border-radius: 4px;")
        self.start_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)

    def stop_bot(self):
        if self.bot_thread:
            self.console.append("[*] Stopping bot process...")
            self.bot_thread.stop()
            self.bot_thread = None

        self.status_lbl.setText("STATUS: OFFLINE")
        self.status_lbl.setStyleSheet("color: #da373c; font-weight: bold; padding: 4px 10px; background: #2b2d31; border-radius: 4px;")
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)

    def handle_bot_output(self, line):
        self.console.append(line)

    def handle_bot_finished(self, code):
        self.console.append(f"[*] Bot process terminated with exit code {code}.")
        self.stop_bot()

    def refresh_tickets(self):
        try:
            stats = database.get_stats()
            self.stat_total.setText(f"Total Tickets: {stats['total']}")
            self.stat_open.setText(f"Open: {stats['open']}")
            self.stat_closed.setText(f"Closed: {stats['closed']}")
            self.stat_claimed.setText(f"Claimed: {stats['claimed']}")

            tickets = database.get_all_tickets()
            self.ticket_table.setRowCount(len(tickets))
            for row_idx, t in enumerate(tickets):
                self.ticket_table.setItem(row_idx, 0, QTableWidgetItem(str(t["id"])))
                self.ticket_table.setItem(row_idx, 1, QTableWidgetItem(f"#{t['ticket_num']:04d}"))
                self.ticket_table.setItem(row_idx, 2, QTableWidgetItem(t["category"]))
                self.ticket_table.setItem(row_idx, 3, QTableWidgetItem(t["author_name"]))
                self.ticket_table.setItem(row_idx, 4, QTableWidgetItem(t.get("priority", "Normal")))
                self.ticket_table.setItem(row_idx, 5, QTableWidgetItem(t["status"].upper()))
                self.ticket_table.setItem(row_idx, 6, QTableWidgetItem(t.get("claimer_name") or "Unclaimed"))
        except Exception as e:
            self.console.append(f"[-] Error refreshing tickets: {e}")

    def open_transcripts_folder(self):
        tdir = os.path.join(os.path.dirname(__file__), "transcripts")
        os.makedirs(tdir, exist_ok=True)
        os.startfile(tdir)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
