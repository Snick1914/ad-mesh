// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'device_config_model.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetDeviceConfigModelCollection on Isar {
  IsarCollection<DeviceConfigModel> get deviceConfigModels => this.collection();
}

const DeviceConfigModelSchema = CollectionSchema(
  name: r'DeviceConfigModel',
  id: 2084895945871783880,
  properties: {
    r'customBackendUrl': PropertySchema(
      id: 0,
      name: r'customBackendUrl',
      type: IsarType.string,
    ),
    r'isPaired': PropertySchema(
      id: 1,
      name: r'isPaired',
      type: IsarType.bool,
    ),
    r'layout': PropertySchema(
      id: 2,
      name: r'layout',
      type: IsarType.string,
    ),
    r'layoutConfigJson': PropertySchema(
      id: 3,
      name: r'layoutConfigJson',
      type: IsarType.string,
    ),
    r'pairingCode': PropertySchema(
      id: 4,
      name: r'pairingCode',
      type: IsarType.string,
    ),
    r'resolution': PropertySchema(
      id: 5,
      name: r'resolution',
      type: IsarType.string,
    ),
    r'serialNumber': PropertySchema(
      id: 6,
      name: r'serialNumber',
      type: IsarType.string,
    )
  },
  estimateSize: _deviceConfigModelEstimateSize,
  serialize: _deviceConfigModelSerialize,
  deserialize: _deviceConfigModelDeserialize,
  deserializeProp: _deviceConfigModelDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _deviceConfigModelGetId,
  getLinks: _deviceConfigModelGetLinks,
  attach: _deviceConfigModelAttach,
  version: '3.1.0+1',
);

int _deviceConfigModelEstimateSize(
  DeviceConfigModel object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  {
    final value = object.customBackendUrl;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.layout.length * 3;
  bytesCount += 3 + object.layoutConfigJson.length * 3;
  bytesCount += 3 + object.pairingCode.length * 3;
  bytesCount += 3 + object.resolution.length * 3;
  bytesCount += 3 + object.serialNumber.length * 3;
  return bytesCount;
}

void _deviceConfigModelSerialize(
  DeviceConfigModel object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.customBackendUrl);
  writer.writeBool(offsets[1], object.isPaired);
  writer.writeString(offsets[2], object.layout);
  writer.writeString(offsets[3], object.layoutConfigJson);
  writer.writeString(offsets[4], object.pairingCode);
  writer.writeString(offsets[5], object.resolution);
  writer.writeString(offsets[6], object.serialNumber);
}

DeviceConfigModel _deviceConfigModelDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = DeviceConfigModel();
  object.customBackendUrl = reader.readStringOrNull(offsets[0]);
  object.id = id;
  object.isPaired = reader.readBool(offsets[1]);
  object.layout = reader.readString(offsets[2]);
  object.layoutConfigJson = reader.readString(offsets[3]);
  object.pairingCode = reader.readString(offsets[4]);
  object.resolution = reader.readString(offsets[5]);
  object.serialNumber = reader.readString(offsets[6]);
  return object;
}

P _deviceConfigModelDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readStringOrNull(offset)) as P;
    case 1:
      return (reader.readBool(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readString(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _deviceConfigModelGetId(DeviceConfigModel object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _deviceConfigModelGetLinks(
    DeviceConfigModel object) {
  return [];
}

void _deviceConfigModelAttach(
    IsarCollection<dynamic> col, Id id, DeviceConfigModel object) {
  object.id = id;
}

extension DeviceConfigModelQueryWhereSort
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QWhere> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension DeviceConfigModelQueryWhere
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QWhereClause> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhereClause>
      idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterWhereClause>
      idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension DeviceConfigModelQueryFilter
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QFilterCondition> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'customBackendUrl',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'customBackendUrl',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'customBackendUrl',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'customBackendUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'customBackendUrl',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'customBackendUrl',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      customBackendUrlIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'customBackendUrl',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      isPairedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'isPaired',
        value: value,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'layout',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'layout',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'layout',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'layout',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'layout',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'layoutConfigJson',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'layoutConfigJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'layoutConfigJson',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'layoutConfigJson',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      layoutConfigJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'layoutConfigJson',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'pairingCode',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'pairingCode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'pairingCode',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'pairingCode',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      pairingCodeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'pairingCode',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'resolution',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'resolution',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'resolution',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'resolution',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      resolutionIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'resolution',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'serialNumber',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'serialNumber',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'serialNumber',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serialNumber',
        value: '',
      ));
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterFilterCondition>
      serialNumberIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'serialNumber',
        value: '',
      ));
    });
  }
}

extension DeviceConfigModelQueryObject
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QFilterCondition> {}

extension DeviceConfigModelQueryLinks
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QFilterCondition> {}

extension DeviceConfigModelQuerySortBy
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QSortBy> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByCustomBackendUrl() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'customBackendUrl', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByCustomBackendUrlDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'customBackendUrl', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByIsPaired() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isPaired', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByIsPairedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isPaired', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByLayout() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layout', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByLayoutDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layout', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByLayoutConfigJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layoutConfigJson', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByLayoutConfigJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layoutConfigJson', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByPairingCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pairingCode', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByPairingCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pairingCode', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByResolution() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'resolution', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortByResolutionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'resolution', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortBySerialNumber() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serialNumber', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      sortBySerialNumberDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serialNumber', Sort.desc);
    });
  }
}

extension DeviceConfigModelQuerySortThenBy
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QSortThenBy> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByCustomBackendUrl() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'customBackendUrl', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByCustomBackendUrlDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'customBackendUrl', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByIsPaired() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isPaired', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByIsPairedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isPaired', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByLayout() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layout', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByLayoutDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layout', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByLayoutConfigJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layoutConfigJson', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByLayoutConfigJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'layoutConfigJson', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByPairingCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pairingCode', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByPairingCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pairingCode', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByResolution() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'resolution', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenByResolutionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'resolution', Sort.desc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenBySerialNumber() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serialNumber', Sort.asc);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QAfterSortBy>
      thenBySerialNumberDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serialNumber', Sort.desc);
    });
  }
}

extension DeviceConfigModelQueryWhereDistinct
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct> {
  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByCustomBackendUrl({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'customBackendUrl',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByIsPaired() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'isPaired');
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByLayout({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'layout', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByLayoutConfigJson({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'layoutConfigJson',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByPairingCode({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'pairingCode', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctByResolution({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'resolution', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<DeviceConfigModel, DeviceConfigModel, QDistinct>
      distinctBySerialNumber({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'serialNumber', caseSensitive: caseSensitive);
    });
  }
}

extension DeviceConfigModelQueryProperty
    on QueryBuilder<DeviceConfigModel, DeviceConfigModel, QQueryProperty> {
  QueryBuilder<DeviceConfigModel, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<DeviceConfigModel, String?, QQueryOperations>
      customBackendUrlProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'customBackendUrl');
    });
  }

  QueryBuilder<DeviceConfigModel, bool, QQueryOperations> isPairedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'isPaired');
    });
  }

  QueryBuilder<DeviceConfigModel, String, QQueryOperations> layoutProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'layout');
    });
  }

  QueryBuilder<DeviceConfigModel, String, QQueryOperations>
      layoutConfigJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'layoutConfigJson');
    });
  }

  QueryBuilder<DeviceConfigModel, String, QQueryOperations>
      pairingCodeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'pairingCode');
    });
  }

  QueryBuilder<DeviceConfigModel, String, QQueryOperations>
      resolutionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'resolution');
    });
  }

  QueryBuilder<DeviceConfigModel, String, QQueryOperations>
      serialNumberProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serialNumber');
    });
  }
}
