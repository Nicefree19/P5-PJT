/**
 * Notification Module - 알림 시스템
 * index.html dashboard()에 mixin-spread 패턴으로 통합
 *
 * @module NotificationModule
 * @version 2.5.0
 */
(function() {
    'use strict';

    window.NotificationModule = {

        showNotification(title, message, type = 'info', options = {}) {
            const id = ++this.notificationIdCounter;
            const notification = {
                id,
                title,
                message,
                type,
                timestamp: new Date(),
                read: false,
                closing: false,
                action: options.action || null,
                data: options.data || null
            };

            this.activeNotifications.unshift(notification);
            if (this.activeNotifications.length > 3) {
                this.activeNotifications.pop();
            }

            this.notificationHistory.unshift({ ...notification });
            if (this.notificationHistory.length > 50) {
                this.notificationHistory.pop();
            }

            if (type === 'critical' || type === 'error') {
                this.playNotificationSound(type);
            }

            const duration = options.duration || (type === 'critical' ? 10000 : 5000);
            setTimeout(() => {
                this.dismissNotification(id);
            }, duration);

            console.log(`[Notification] ${type.toUpperCase()}: ${title}`);
            return id;
        },

        showToast(message, type = 'info') {
            const titles = {
                success: '✅ 완료',
                info: 'ℹ️ 안내',
                warning: '⚠️ 주의',
                error: '❌ 오류',
                critical: '🚨 긴급'
            };
            return this.showNotification(titles[type] || titles.info, message, type);
        },

        announce(message) {
            const el = document.getElementById('sr-announcements');
            if (el) {
                el.textContent = '';
                setTimeout(() => { el.textContent = message; }, 100);
            }
        },

        announceError(message) {
            const el = document.getElementById('sr-errors');
            if (el) {
                el.textContent = '';
                setTimeout(() => { el.textContent = message; }, 100);
            }
        },

        dismissNotification(id) {
            const notification = this.activeNotifications.find(n => n.id === id);
            if (notification) {
                notification.closing = true;
                setTimeout(() => {
                    this.activeNotifications = this.activeNotifications.filter(n => n.id !== id);
                }, 300);
            }
        },

        handleNotificationClick(notification) {
            const historyItem = this.notificationHistory.find(n => n.id === notification.id);
            if (historyItem) {
                historyItem.read = true;
            }

            if (notification.action && typeof notification.action === 'function') {
                notification.action(notification.data);
            }

            this.dismissNotification(notification.id);
        },

        handleHistoryItemClick(notification) {
            notification.read = true;

            if (notification.data?.issueId) {
                this.selectedIssue = this.issues.find(i => i.id === notification.data.issueId);
                this.issuePanelOpen = true;
                this.notificationPanelOpen = false;
            }
        },

        toggleNotificationPanel() {
            this.notificationPanelOpen = !this.notificationPanelOpen;

            if (this.notificationPanelOpen) {
                this.issuePanelOpen = false;
            }
        },

        markAllNotificationsRead() {
            this.notificationHistory.forEach(n => n.read = true);
            this.showToast('모든 알림을 읽음 처리했습니다', 'success');
        },

        clearNotificationHistory() {
            if (confirm('모든 알림 히스토리를 삭제하시겠습니까?')) {
                this.notificationHistory = [];
                this.showToast('알림 히스토리가 삭제되었습니다', 'info');
            }
        },

        getNotificationIcon(type) {
            const icons = {
                success: '✅',
                info: 'ℹ️',
                warning: '⚠️',
                error: '❌',
                critical: '🚨'
            };
            return icons[type] || icons.info;
        },

        formatNotificationTime(timestamp) {
            const now = new Date();
            const diff = now - new Date(timestamp);
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (seconds < 60) return '방금 전';
            if (minutes < 60) return `${minutes}분 전`;
            if (hours < 24) return `${hours}시간 전`;
            if (days < 7) return `${days}일 전`;

            const date = new Date(timestamp);
            return `${date.getMonth() + 1}월 ${date.getDate()}일`;
        },

        playNotificationSound(type) {
            try {
                if ('vibrate' in navigator) {
                    if (type === 'critical') {
                        navigator.vibrate([200, 100, 200, 100, 200]);
                    } else {
                        navigator.vibrate(200);
                    }
                }

                if ('Notification' in window && Notification.permission === 'granted') {
                    // 시스템 알림을 통한 소리 (선택사항)
                }
            } catch (e) {
                // 오류 무시 (사운드는 선택 기능)
            }
        }
    };
})();
