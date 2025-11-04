import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Filter, Gift, Wallet as WalletIcon, ChevronRight, HelpCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import type { WalletTransaction } from '@/types';

type WalletTypeFilter = 'all' | 'virtual' | 'actual';
type FlowTypeFilter = 'all' | 'income' | 'spends' | 'conversions';

type TransactionGroup = {
  type: 'single';
  transaction: WalletTransaction;
} | {
  type: 'conversion';
  conversionId: string;
  debit: WalletTransaction;
  credit: WalletTransaction;
  timestamp: string;
};

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet, isAuthenticated, user } = useAuth();
  const [selectedWalletType, setSelectedWalletType] = useState<WalletTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [flowTypeFilter, setFlowTypeFilter] = useState<FlowTypeFilter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Redirect to auth if not logged in
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  const transactionGroups = useMemo(() => {
    const groups: TransactionGroup[] = [];
    const processedIds = new Set<string>();

    const sortedTransactions = [...wallet.transactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedTransactions.forEach(txn => {
      if (processedIds.has(txn.id)) return;

      // Group referral conversion transactions by order_id and same timestamp
      if (txn.kind === 'ADJUSTMENT' && txn.orderId) {
        const pair = sortedTransactions.find(
          t => t.orderId === txn.orderId && 
               t.kind === 'REFERRAL_REWARD' && 
               t.id !== txn.id &&
               Math.abs(new Date(t.timestamp).getTime() - new Date(txn.timestamp).getTime()) < 60000 // Within 1 minute
        );

        if (pair) {
          processedIds.add(txn.id);
          processedIds.add(pair.id);

          const debit = txn.direction === 'DEBIT' ? txn : pair;
          const credit = txn.direction === 'CREDIT' ? txn : pair;

          groups.push({
            type: 'conversion',
            conversionId: txn.orderId || 'unknown',
            debit,
            credit,
            timestamp: txn.timestamp,
          });
        } else {
          processedIds.add(txn.id);
          groups.push({ type: 'single', transaction: txn });
        }
      } else if (txn.kind === 'REFERRAL_REWARD' && txn.orderId) {
        // Check if this referral reward has a corresponding adjustment
        const pair = sortedTransactions.find(
          t => t.orderId === txn.orderId && 
               t.kind === 'ADJUSTMENT' && 
               t.id !== txn.id &&
               Math.abs(new Date(t.timestamp).getTime() - new Date(txn.timestamp).getTime()) < 60000 // Within 1 minute
        );

        if (pair) {
          processedIds.add(txn.id);
          processedIds.add(pair.id);

          const debit = pair;
          const credit = txn;

          groups.push({
            type: 'conversion',
            conversionId: txn.orderId || 'unknown',
            debit,
            credit,
            timestamp: txn.timestamp,
          });
        } else {
          processedIds.add(txn.id);
          groups.push({ type: 'single', transaction: txn });
        }
      } else {
        processedIds.add(txn.id);
        groups.push({ type: 'single', transaction: txn });
      }
    });

    return groups;
  }, [wallet.transactions]);

  const filteredTransactionGroups = useMemo(() => {
    let filtered = transactionGroups;

    if (flowTypeFilter === 'conversions') {
      filtered = filtered.filter(g => g.type === 'conversion');
    } else if (flowTypeFilter === 'income') {
      filtered = filtered.filter(g => {
        if (g.type === 'conversion') return false;
        return g.transaction.amount > 0;
      });
    } else if (flowTypeFilter === 'spends') {
      filtered = filtered.filter(g => {
        if (g.type === 'conversion') return false;
        return g.transaction.amount < 0;
      });
    }

    if (selectedWalletType !== 'all') {
      filtered = filtered.filter(g => {
        if (g.type === 'conversion') {
          return g.debit.walletType === selectedWalletType || g.credit.walletType === selectedWalletType;
        }
        return g.transaction.walletType === selectedWalletType;
      });
    }

    return filtered;
  }, [transactionGroups, selectedWalletType, flowTypeFilter]);

  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: TransactionGroup[] } = {};
    
    filteredTransactionGroups.forEach(group => {
      const timestamp = group.type === 'conversion' ? group.timestamp : group.transaction.timestamp;
      const date = new Date(timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(group);
    });
    
    return groups;
  }, [filteredTransactionGroups]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = wallet.transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate.getMonth() === now.getMonth() && 
             txnDate.getFullYear() === now.getFullYear();
    });

    // Virtual Income: Total cashback received on user's own orders (virtual wallet credits for cashback)
    const virtualIncome = thisMonth
      .filter(t => 
        t.walletType === 'virtual' && 
        t.direction === 'CREDIT' && 
        t.kind === 'CASHBACK'
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Actual Income: Total value added to actual wallet (conversions + refunds)
    const actualIncome = thisMonth
      .filter(t => 
        t.walletType === 'actual' && 
        t.direction === 'CREDIT' && 
        (t.kind === 'REFERRAL_REWARD' || t.kind === 'REFUND')
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Spent: Total amount spent from actual wallet for orders (actual wallet debits for order payments)
    const actualSpends = thisMonth
      .filter(t => 
        t.walletType === 'actual' && 
        t.direction === 'DEBIT' && 
        t.kind === 'ORDER_PAYMENT'
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Converted: Total converted values from virtual to actual wallet (referral reward credits to actual wallet)
    const conversions = thisMonth
      .filter(t => 
        t.walletType === 'actual' && 
        t.direction === 'CREDIT' && 
        t.kind === 'REFERRAL_REWARD'
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return { virtualIncome, actualIncome, actualSpends, conversions };
  }, [wallet.transactions]);

  const resetFilters = () => {
    setSelectedWalletType('all');
    setFlowTypeFilter('all');
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  // Helper function to clean up transaction descriptions and extract meaningful info
  const getCleanTransactionTitle = (description: string, kind: string) => {
    // Remove UUID patterns from descriptions
    const cleanDescription = description.replace(/\(referee:\s*[a-f0-9-]{36}\)/gi, '');
    
    switch (kind) {
      case 'CASHBACK':
        return cleanDescription.replace(/for order HEKO-\d+-\w+/gi, '');
      case 'REFERRAL_REWARD':
        return 'Referral Reward Earned';
      case 'ADJUSTMENT':
        return 'Virtual to Actual Conversion';
      case 'ORDER_PAYMENT':
        return 'Wallet Payment';
      case 'REFUND':
        return 'Order Refund';
      default:
        return cleanDescription;
    }
  };

  const getTransactionSubtitle = (txn: WalletTransaction) => {
    if (txn.orderId) {
      const orderNumber = txn.orderId.includes('HEKO-') 
        ? txn.orderId 
        : `Order #${txn.orderId.slice(-6)}`;
      return orderNumber;
    }
    return 'Transaction';
  };

  const getTransactionIcon = (type: string, kind?: string) => {
    if (kind === 'ADJUSTMENT') return '🔄';
    if (kind === 'REFERRAL_REWARD') return '🎁';
    if (kind === 'ORDER_PAYMENT') return '💳';
    
    switch (type) {
      case 'CASHBACK':
        return '🎁';
      case 'REFERRAL':
        return '👥';
      case 'REFUND':
        return '↩️';
      case 'REDEMPTION':
        return '💳';
      case 'ADJUSTMENT':
        return '⚖️';
      default:
        return '💰';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'My Wallet',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <HelpCircle size={22} color={Colors.text.secondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceContainer}>
          <TouchableOpacity
            style={[
              styles.balanceCard,
              styles.virtualCard,
              selectedWalletType === 'virtual' && styles.selectedCard,
            ]}
            onPress={() => setSelectedWalletType(selectedWalletType === 'virtual' ? 'all' : 'virtual')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Gift size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.balanceLabel}>Virtual Wallet</Text>
            <Text style={styles.balanceAmount}>₹{wallet.virtualBalance}</Text>
            <Text style={styles.balanceCaption}>Convertible (not spendable)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.balanceCard,
              styles.actualCard,
              selectedWalletType === 'actual' && styles.selectedCard,
            ]}
            onPress={() => setSelectedWalletType(selectedWalletType === 'actual' ? 'all' : 'actual')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <WalletIcon size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.balanceLabel}>Actual Wallet</Text>
            <Text style={styles.balanceAmount}>₹{wallet.actualBalance}</Text>
            <Text style={styles.balanceCaption}>Spendable</Text>
          </TouchableOpacity>
        </View>

        {selectedWalletType !== 'all' && (
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              Filtering: {selectedWalletType === 'virtual' ? 'Virtual' : 'Actual'}
            </Text>
          </View>
        )}

        <View style={styles.monthlySummary}>
          <Text style={styles.monthlySummaryTitle}>This month</Text>
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Virtual Income</Text>
              <Text style={[styles.statValue, styles.incomeText]}>+₹{monthlyStats.virtualIncome}</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Actual Income</Text>
              <Text style={[styles.statValue, styles.incomeText]}>+₹{monthlyStats.actualIncome}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={[styles.statValue, styles.spendText]}>-₹{monthlyStats.actualSpends}</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Converted</Text>
              <Text style={[styles.statValue, styles.conversionText]}>₹{monthlyStats.conversions}</Text>
            </View>
          </View>
        </View>

        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
            <Filter size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsList}>
          {Object.keys(groupedByDate).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            Object.keys(groupedByDate).map((date) => {
              const groups = groupedByDate[date];
              return (
                <View key={date} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>{date}</Text>
                  {groups.map((group, idx) => {
                if (group.type === 'conversion') {
                  return (
                    <View key={group.conversionId} style={styles.conversionGroup}>
                      <View style={styles.conversionHeader}>
                        <Text style={styles.conversionIcon}>🔄</Text>
                        <Text style={styles.conversionTitle}>Referral Conversion</Text>
                        <Text style={styles.conversionAmount}>₹{group.debit.amount}</Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.conversionItem}
                        onPress={() => setSelectedTransaction(group.debit)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={styles.conversionIndicator}>
                            <Text style={styles.conversionArrow}>↓</Text>
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle}>From Virtual Wallet</Text>
                            <Text style={styles.transactionSubtitle}>
                              {group.debit.orderId ? `Referee Order #${group.debit.orderId.slice(-6)}` : 'Referral conversion'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.transactionRight}>
                          <Text style={[styles.transactionAmount, styles.negativeAmount]}>
                            -₹{Math.abs(group.debit.amount)}
                          </Text>
                          <ChevronRight size={16} color={Colors.text.tertiary} />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.conversionItem}
                        onPress={() => setSelectedTransaction(group.credit)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={styles.conversionIndicator}>
                            <Text style={styles.conversionArrow}>↑</Text>
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle}>To Actual Wallet</Text>
                            <Text style={styles.transactionSubtitle}>
                              {group.credit.orderId ? `Referee Order #${group.credit.orderId.slice(-6)}` : 'Referral conversion'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.transactionRight}>
                          <Text style={[styles.transactionAmount, styles.positiveAmount]}>
                            +₹{group.credit.amount}
                          </Text>
                          <ChevronRight size={16} color={Colors.text.tertiary} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }

                const txn = group.transaction;
                return (
                  <TouchableOpacity
                    key={txn.id}
                    style={styles.transactionItem}
                    onPress={() => setSelectedTransaction(txn)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionLeft}>
                      <Text style={styles.transactionIcon}>{getTransactionIcon(txn.type, txn.kind)}</Text>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>{getCleanTransactionTitle(txn.description, txn.kind)}</Text>
                        <Text style={styles.transactionSubtitle}>
                          {getTransactionSubtitle(txn)}
                        </Text>
                        <View style={styles.walletTag}>
                          <Text style={styles.walletTagText}>
                            {txn.walletType === 'virtual' ? 'Virtual' : 'Actual'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          txn.direction === 'CREDIT' ? styles.positiveAmount : styles.negativeAmount,
                        ]}
                      >
                        {txn.direction === 'CREDIT' ? '+' : '-'}₹{Math.abs(txn.amount)}
                      </Text>
                      <ChevronRight size={16} color={Colors.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 24) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterHandle} />
            <Text style={styles.filterSheetTitle}>Filters</Text>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Wallet Type</Text>
              <View style={styles.radioGroup}>
                {(['all', 'virtual', 'actual'] as WalletTypeFilter[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.radioOption}
                    onPress={() => setSelectedWalletType(type)}
                  >
                    <View style={styles.radio}>
                      {selectedWalletType === type && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.radioLabel}>
                      {type === 'all' ? 'All' : type === 'virtual' ? 'Virtual' : 'Actual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Flow Type</Text>
              <View style={styles.radioGroup}>
                {(['all', 'income', 'spends', 'conversions'] as FlowTypeFilter[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.radioOption}
                    onPress={() => setFlowTypeFilter(type)}
                  >
                    <View style={styles.radio}>
                      {flowTypeFilter === type && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.radioLabel}>
                      {type === 'all' ? 'All' : type === 'income' ? 'Income (credits)' : type === 'spends' ? 'Spends (debits)' : 'Conversions'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!selectedTransaction}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTransaction(null)}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {selectedTransaction && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailIcon}>{getTransactionIcon(selectedTransaction.type, selectedTransaction.kind)}</Text>
                  <Text style={styles.detailTitle}>{selectedTransaction.description}</Text>
                </View>

                <Text
                  style={[
                    styles.detailAmount,
                    selectedTransaction.amount > 0 ? styles.positiveAmount : styles.negativeAmount,
                  ]}
                >
                  {selectedTransaction.amount > 0 ? '+' : ''}₹{Math.abs(selectedTransaction.amount)}
                </Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Wallet</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.walletType === 'virtual' ? 'Virtual' : 'Actual'}
                  </Text>
                </View>

                {selectedTransaction.orderId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order/Reference ID</Text>
                    <TouchableOpacity onPress={() => {
                      setSelectedTransaction(null);
                      router.push(`/order/${selectedTransaction.orderId}`);
                    }}>
                      <Text style={styles.detailLink}>{selectedTransaction.orderId}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Timestamp</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedTransaction.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance After</Text>
                  <Text style={styles.detailValue}>₹{selectedTransaction.balanceAfter}</Text>
                </View>

                {selectedTransaction.conversionId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Conversion ID</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.conversionId}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedTransaction(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  balanceContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  virtualCard: {
    backgroundColor: '#8B5CF6',
  },
  actualCard: {
    backgroundColor: '#10B981',
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: Colors.brand.primary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceCaption: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterChip: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.brand.primaryLight,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  filterButton: {
    padding: 8,
  },
  transactionsList: {
    paddingHorizontal: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  transactionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  walletTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  walletTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  positiveAmount: {
    color: Colors.status.success,
  },
  negativeAmount: {
    color: Colors.status.error,
  },
  monthlySummary: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
  },
  monthlySummaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  incomeText: {
    color: Colors.status.success,
    fontWeight: '600' as const,
  },
  spendText: {
    color: Colors.status.error,
    fontWeight: '600' as const,
  },
  conversionText: {
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
  conversionGroup: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.brand.primaryLight,
  },
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.brand.primaryLight,
    gap: 8,
  },
  conversionIcon: {
    fontSize: 20,
  },
  conversionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  conversionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  conversionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  conversionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversionArrow: {
    fontSize: 18,
    color: Colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  filterHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  detailSheet: {
    backgroundColor: Colors.background.primary,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginVertical: 'auto' as any,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  detailAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  detailLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
