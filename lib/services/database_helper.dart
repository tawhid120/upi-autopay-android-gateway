import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/payment_model.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('payverify.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    const idType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const textType = 'TEXT NOT NULL';
    const textNullable = 'TEXT';
    const realType = 'REAL NOT NULL';
    const intType = 'INTEGER NOT NULL';

    await db.execute('''
      CREATE TABLE payments (
        id $idType,
        trx_id TEXT UNIQUE NOT NULL,
        service $textType,
        sender $textType,
        amount $realType,
        reference $textNullable,
        timestamp $intType,
        date_time_str $textType,
        raw_message $textType,
        payment_type $textType,
        sync_status $intType DEFAULT 0,
        sync_error $textNullable,
        synced_at $textNullable,
        created_at $textType
      )
    ''');

    // Index on trx_id and sync_status for high performance lookups
    await db.execute('CREATE INDEX idx_trx_id ON payments (trx_id)');
    await db.execute('CREATE INDEX idx_sync_status ON payments (sync_status)');
  }

  /// Inserts a new payment. Returns row ID, or null if duplicate trx_id
  Future<int?> insertPayment(PaymentModel payment) async {
    final db = await instance.database;

    try {
      final map = payment.toMap();
      map.remove('id');
      map['created_at'] = DateTime.now().toIso8601String();

      final id = await db.insert(
        'payments',
        map,
        conflictAlgorithm: ConflictAlgorithm.ignore,
      );

      if (id == 0) {
        // Ignored due to duplicate trx_id
        return null;
      }
      return id;
    } catch (e) {
      print("DatabaseHelper insertPayment error: $e");
      return null;
    }
  }

  /// Check if a TrxID is already recorded
  Future<bool> hasPayment(String trxId) async {
    final db = await instance.database;
    final result = await db.query(
      'payments',
      columns: ['id'],
      where: 'trx_id = ?',
      whereArgs: [trxId],
      limit: 1,
    );
    return result.isNotEmpty;
  }

  /// Fetch all payments with optional filtering
  Future<List<PaymentModel>> getAllPayments({
    String? serviceFilter,
    SyncStatus? statusFilter,
    int limit = 200,
    int offset = 0,
  }) async {
    final db = await instance.database;

    String? whereClause;
    List<dynamic> whereArgs = [];

    if (serviceFilter != null && serviceFilter != 'All') {
      whereClause = 'service = ?';
      whereArgs.add(serviceFilter);
    }

    if (statusFilter != null) {
      const statusStr = 'sync_status = ?';
      whereClause = (whereClause == null) ? statusStr : '$whereClause AND $statusStr';
      whereArgs.add(statusFilter.toInt());
    }

    final result = await db.query(
      'payments',
      where: whereClause,
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: 'timestamp DESC',
      limit: limit,
      offset: offset,
    );

    return result.map((json) => PaymentModel.fromMap(json)).toList();
  }

  /// Fetch all pending (unsynced) payments
  Future<List<PaymentModel>> getPendingPayments() async {
    final db = await instance.database;
    final result = await db.query(
      'payments',
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: [SyncStatus.pending.toInt(), SyncStatus.failed.toInt()],
      orderBy: 'timestamp ASC',
    );

    return result.map((json) => PaymentModel.fromMap(json)).toList();
  }

  /// Mark payment as synced to VPS Server
  Future<int> markPaymentSynced(String trxId) async {
    final db = await instance.database;
    return await db.update(
      'payments',
      {
        'sync_status': SyncStatus.synced.toInt(),
        'synced_at': DateTime.now().toIso8601String(),
        'sync_error': null,
      },
      where: 'trx_id = ?',
      whereArgs: [trxId],
    );
  }

  /// Mark payment as failed to sync
  Future<int> markPaymentFailed(String trxId, String errorMessage) async {
    final db = await instance.database;
    return await db.update(
      'payments',
      {
        'sync_status': SyncStatus.failed.toInt(),
        'sync_error': errorMessage,
      },
      where: 'trx_id = ?',
      whereArgs: [trxId],
    );
  }

  /// Get summary statistics for the dashboard
  Future<Map<String, dynamic>> getStatistics() async {
    final db = await instance.database;

    final totalCountRes = await db.rawQuery('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount FROM payments');
    final syncedCountRes = await db.rawQuery('SELECT COUNT(*) as count FROM payments WHERE sync_status = ?', [SyncStatus.synced.toInt()]);
    final pendingCountRes = await db.rawQuery('SELECT COUNT(*) as count FROM payments WHERE sync_status != ?', [SyncStatus.synced.toInt()]);

    final bkashSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['bKash']);
    final nagadSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['Nagad']);
    final rocketSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['Rocket']);

    final phonepeSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['PhonePe']);
    final gpaySumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['Google Pay']);
    final paytmSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['Paytm']);
    final fampaySumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['FamPay']);
    final bhimSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service = ?', ['BHIM']);
    final bankSumRes = await db.rawQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE service LIKE ? OR service LIKE ?', ['%Bank%', '%UPI%']);

    return {
      'totalCount': (totalCountRes.first['count'] as int?) ?? 0,
      'totalAmount': (totalCountRes.first['total_amount'] as num?)?.toDouble() ?? 0.0,
      'syncedCount': (syncedCountRes.first['count'] as int?) ?? 0,
      'pendingCount': (pendingCountRes.first['count'] as int?) ?? 0,
      'bkashAmount': (bkashSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'nagadAmount': (nagadSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'rocketAmount': (rocketSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'phonepeAmount': (phonepeSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'gpayAmount': (gpaySumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'paytmAmount': (paytmSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'fampayAmount': (fampaySumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'bhimAmount': (bhimSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
      'bankAmount': (bankSumRes.first['total'] as num?)?.toDouble() ?? 0.0,
    };
  }

  /// Clear all payments (used if user clicks Reset/Purge)
  Future<void> clearAll() async {
    final db = await instance.database;
    await db.delete('payments');
  }

  Future close() async {
    final db = await instance.database;
    db.close();
  }
}
